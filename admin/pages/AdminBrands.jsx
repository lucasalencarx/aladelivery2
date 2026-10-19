import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Tags,
  Package,
  CheckCircle2,
  XCircle,
  X,
  Image as ImageIcon,
  Loader2,
  Star,
} from "lucide-react";

import PageHeader from "../components/PageHeader";

/*
  ============================================================
  IMPORTANTE
  ============================================================

  Troque "adminService" pelo NOME REAL do arquivo onde estão:

  getProducts()
  getCategories()
  getBrands()
  createBrand()
  updateBrand()
  deleteBrand()

  Exemplo:
  ../services/adminService
  ../services/catalogService
  ../services/productService
*/

import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
} from "../services/adminService";


// ============================================================
// GERAR SLUG
// ============================================================

function createSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}


// ============================================================
// COMPONENTE
// ============================================================

export default function AdminBrands() {

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [brands, setBrands] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingBrand, setEditingBrand] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    website_url: "",
    active: true,
    featured: false,
  });


  // ==========================================================
  // CARREGAR MARCAS DO SUPABASE
  // ==========================================================

  async function loadBrands() {
    try {

      setLoading(true);

      const data = await getBrands();

      console.log(
        "Marcas carregadas:",
        data
      );

      setBrands(data || []);

    } catch (error) {

      console.error(
        "Erro ao carregar marcas:",
        error
      );

      alert(
        "Não foi possível carregar as marcas."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // CARREGAR AO ABRIR A PÁGINA
  // ==========================================================

  useEffect(() => {

    loadBrands();

  }, []);


  // ==========================================================
  // FILTRO / PESQUISA
  // ==========================================================

  const filteredBrands = useMemo(() => {

    const term =
      search
        .trim()
        .toLowerCase();

    return brands.filter((brand) => {

      const name =
        String(
          brand.name || ""
        ).toLowerCase();

      const slug =
        String(
          brand.slug || ""
        ).toLowerCase();

      const matchesSearch =
        !term ||
        name.includes(term) ||
        slug.includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (
          statusFilter === "active" &&
          brand.active
        ) ||
        (
          statusFilter === "inactive" &&
          !brand.active
        );

      return (
        matchesSearch &&
        matchesStatus
      );

    });

  }, [
    brands,
    search,
    statusFilter,
  ]);


  // ==========================================================
  // ESTATÍSTICAS
  // ==========================================================

  const totalBrands =
    brands.length;


  const activeBrands =
    brands.filter(
      (brand) =>
        brand.active
    ).length;


  const totalProducts =
    brands.reduce(
      (total, brand) => {

        return (
          total +
          Number(
            brand.products_count || 0
          )
        );

      },
      0
    );


  // ==========================================================
  // ABRIR NOVA MARCA
  // ==========================================================

  function openNewBrand() {

    setEditingBrand(null);

    setForm({
      name: "",
      description: "",
      logo_url: "",
      website_url: "",
      active: true,
      featured: false,
    });

    setModalOpen(true);

  }


  // ==========================================================
  // ABRIR EDIÇÃO
  // ==========================================================

  function openEditBrand(brand) {

    setEditingBrand(brand);

    setForm({
      name:
        brand.name || "",

      description:
        brand.description || "",

      logo_url:
        brand.logo_url || "",

      website_url:
        brand.website_url || "",

      active:
        brand.active ?? true,

      featured:
        brand.featured ?? false,
    });

    setModalOpen(true);

  }


  // ==========================================================
  // FECHAR MODAL
  // ==========================================================

  function closeModal() {

    if (saving) {
      return;
    }

    setModalOpen(false);

    setEditingBrand(null);

  }


  // ==========================================================
  // ALTERAR FORMULÁRIO
  // ==========================================================

  function handleFormChange(event) {

    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((current) => ({
      ...current,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

  }


  // ==========================================================
  // SALVAR MARCA
  // ==========================================================

  async function handleSave(event) {

    event.preventDefault();

    const name =
      form.name.trim();

    if (!name) {

      alert(
        "Informe o nome da marca."
      );

      return;

    }

    const payload = {

      name,

      slug:
        createSlug(name),

      description:
        form.description.trim()
          ? form.description.trim()
          : null,

      logo_url:
        form.logo_url.trim()
          ? form.logo_url.trim()
          : null,

      website_url:
        form.website_url.trim()
          ? form.website_url.trim()
          : null,

      active:
        form.active,

      featured:
        form.featured,

    };


    try {

      setSaving(true);


      // ======================================================
      // EDITANDO
      // ======================================================

      if (editingBrand) {

        await updateBrand(
          editingBrand.id,
          payload
        );

      }


      // ======================================================
      // CRIANDO
      // ======================================================

      else {

        await createBrand(
          payload
        );

      }


      // ======================================================
      // RECARREGAR LISTA
      // ======================================================

      await loadBrands();


      setModalOpen(false);

      setEditingBrand(null);


    } catch (error) {

      console.error(
        "Erro ao salvar marca:",
        error
      );


      if (
        error?.code === "23505"
      ) {

        alert(
          "Já existe uma marca com esse nome."
        );

      } else {

        alert(
          error?.message ||
          "Não foi possível salvar a marca."
        );

      }

    } finally {

      setSaving(false);

    }

  }


  // ==========================================================
  // ALTERAR STATUS
  // ==========================================================

  async function handleToggleStatus(brand) {

    try {

      const newStatus =
        !brand.active;


      await toggleBrandStatus(
        brand.id,
        newStatus
      );


      setBrands((current) =>

        current.map((item) =>

          item.id === brand.id

            ? {
                ...item,
                active: newStatus,
              }

            : item

        )

      );


    } catch (error) {

      console.error(
        "Erro ao alterar status:",
        error
      );

      alert(
        "Não foi possível alterar o status da marca."
      );

    }

  }


  // ==========================================================
  // EXCLUIR
  // ==========================================================

  async function handleDelete(brand) {

    const productsCount =
      Number(
        brand.products_count || 0
      );


    // ========================================================
    // NÃO DEIXAR EXCLUIR MARCA COM PRODUTOS
    // ========================================================

    if (productsCount > 0) {

      alert(
        `A marca "${brand.name}" possui ${productsCount} produto(s) vinculado(s).\n\n` +
        `Altere a marca desses produtos antes de excluir.`
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Deseja realmente excluir a marca "${brand.name}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      await deleteBrand(
        brand.id
      );


      setBrands((current) =>

        current.filter(
          (item) =>
            item.id !== brand.id
        )

      );


    } catch (error) {

      console.error(
        "Erro ao excluir marca:",
        error
      );

      alert(
        error?.message ||
        "Não foi possível excluir a marca."
      );

    }

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <section className="adminPage">


      {/* =====================================================
          HEADER
      ===================================================== */}

      <PageHeader

        eyebrow="Cardápio"

        title="Marcas"

        description="Gerencie as marcas dos produtos cadastrados no delivery."

        action={

          <button
            type="button"
            className="adminPrimaryButton"
            onClick={openNewBrand}
          >

            <Plus size={16} />

            Nova Marca

          </button>

        }

      />


      {/* =====================================================
          ESTATÍSTICAS
      ===================================================== */}

      <div className="brandStats">


        {/* TOTAL */}

        <div className="brandStatCard">

          <div className="brandStatIcon">

            <Tags size={20} />

          </div>

          <div>

            <span>
              Total de marcas
            </span>

            <strong>
              {totalBrands}
            </strong>

          </div>

        </div>


        {/* ATIVAS */}

        <div className="brandStatCard">

          <div className="brandStatIcon">

            <CheckCircle2 size={20} />

          </div>

          <div>

            <span>
              Marcas ativas
            </span>

            <strong>
              {activeBrands}
            </strong>

          </div>

        </div>


        {/* PRODUTOS */}

        <div className="brandStatCard">

          <div className="brandStatIcon">

            <Package size={20} />

          </div>

          <div>

            <span>
              Produtos vinculados
            </span>

            <strong>
              {totalProducts}
            </strong>

          </div>

        </div>


      </div>


      {/* =====================================================
          PESQUISA
      ===================================================== */}

      <div className="brandsToolbar">


        <div className="brandsSearch">

          <Search size={18} />


          <input

            type="text"

            placeholder="Pesquisar marca..."

            value={search}

            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }

          />


          {search && (

            <button

              type="button"

              className="brandClearSearch"

              onClick={() =>
                setSearch("")
              }

              title="Limpar pesquisa"

            >

              <X size={15} />

            </button>

          )}

        </div>


        {/* FILTRO */}

        <select

          className="brandsFilter"

          value={statusFilter}

          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }

        >

          <option value="all">
            Todas as marcas
          </option>

          <option value="active">
            Ativas
          </option>

          <option value="inactive">
            Inativas
          </option>

        </select>


      </div>


      {/* =====================================================
          TABELA
      ===================================================== */}

      <div className="brandsTableCard">


        <div className="brandsTableHeader">

          <div>

            <strong>
              Marcas cadastradas
            </strong>

            <span>

              {
                filteredBrands.length
              }{" "}

              marca(s) encontrada(s)

            </span>

          </div>

        </div>


        <div className="brandsTableWrapper">


          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="brandsLoading">

              <Loader2
                size={28}
                className="brandsSpinner"
              />

              <span>
                Carregando marcas...
              </span>

            </div>

          ) : (

            <table className="brandsTable">


              {/* CABEÇALHO */}

              <thead>

                <tr>

                  <th>
                    Marca
                  </th>

                  <th>
                    Produtos
                  </th>

                  <th>
                    Destaque
                  </th>

                  <th>
                    Status
                  </th>

                  <th className="brandsActionsTitle">
                    Ações
                  </th>

                </tr>

              </thead>


              {/* CORPO */}

              <tbody>


                {filteredBrands.map(
                  (brand) => (

                    <tr key={brand.id}>


                      {/* ================================
                          MARCA
                      ================================ */}

                      <td>

                        <div className="brandIdentity">


                          <div className="brandLogo">


                            {brand.logo_url ? (

                              <img

                                src={
                                  brand.logo_url
                                }

                                alt={
                                  brand.name
                                }

                                onError={(event) => {

                                  event.currentTarget.style.display =
                                    "none";

                                }}

                              />

                            ) : (

                              <ImageIcon
                                size={19}
                              />

                            )}


                          </div>


                          <div>

                            <strong>
                              {brand.name}
                            </strong>

                            <span>
                              {brand.slug}
                            </span>

                          </div>


                        </div>

                      </td>


                      {/* ================================
                          PRODUTOS
                      ================================ */}

                      <td>

                        <div className="brandProducts">

                          <Package
                            size={15}
                          />

                          <strong>

                            {
                              brand.products_count ||
                              0
                            }

                          </strong>

                          <span>

                            produto

                            {
                              Number(
                                brand.products_count ||
                                0
                              ) !== 1
                                ? "s"
                                : ""
                            }

                          </span>

                        </div>

                      </td>


                      {/* ================================
                          DESTAQUE
                      ================================ */}

                      <td>


                        {brand.featured ? (

                          <span className="brandFeatured">

                            <Star size={12} />

                            Destaque

                          </span>

                        ) : (

                          <span className="brandNormal">

                            Normal

                          </span>

                        )}


                      </td>


                      {/* ================================
                          STATUS
                      ================================ */}

                      <td>


                        <button

                          type="button"

                          className={

                            brand.active

                              ? "brandStatus brandStatusActive"

                              : "brandStatus brandStatusInactive"

                          }

                          onClick={() =>
                            handleToggleStatus(
                              brand
                            )
                          }

                        >


                          {brand.active ? (

                            <>

                              <CheckCircle2
                                size={14}
                              />

                              Ativa

                            </>

                          ) : (

                            <>

                              <XCircle
                                size={14}
                              />

                              Inativa

                            </>

                          )}


                        </button>


                      </td>


                      {/* ================================
                          AÇÕES
                      ================================ */}

                      <td>


                        <div className="brandActions">


                          {/* EDITAR */}

                          <button

                            type="button"

                            className="brandActionButton"

                            title="Editar marca"

                            onClick={() =>
                              openEditBrand(
                                brand
                              )
                            }

                          >

                            <Pencil
                              size={16}
                            />

                          </button>


                          {/* EXCLUIR */}

                          <button

                            type="button"

                            className="brandActionButton brandDeleteButton"

                            title="Excluir marca"

                            onClick={() =>
                              handleDelete(
                                brand
                              )
                            }

                          >

                            <Trash2
                              size={16}
                            />

                          </button>


                        </div>


                      </td>


                    </tr>

                  )
                )}


                {/* ======================================
                    NENHUMA MARCA
                ====================================== */}

                {
                  filteredBrands.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan={5}
                        className="brandsEmpty"
                      >

                        <Tags size={30} />

                        <strong>
                          Nenhuma marca encontrada
                        </strong>

                        <span>
                          Pesquise novamente ou cadastre uma nova marca.
                        </span>

                      </td>

                    </tr>

                  )
                }


              </tbody>


            </table>

          )}


        </div>


      </div>


      {/* =====================================================
          MODAL
      ===================================================== */}

      {modalOpen && (

        <div

          className="brandModalOverlay"

          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeModal();

            }

          }}

        >


          <div className="brandModal">


            {/* HEADER MODAL */}

            <div className="brandModalHeader">


              <div>

                <span>
                  Cardápio
                </span>

                <h2>

                  {
                    editingBrand
                      ? "Editar Marca"
                      : "Nova Marca"
                  }

                </h2>

              </div>


              <button

                type="button"

                onClick={closeModal}

                className="brandModalClose"

              >

                <X size={20} />

              </button>


            </div>


            {/* =================================================
                FORMULÁRIO
            ================================================= */}

            <form

              onSubmit={handleSave}

              className="brandForm"

            >


              {/* NOME */}

              <label>

                Nome da marca *

                <input

                  type="text"

                  name="name"

                  placeholder="Ex: Heineken"

                  value={form.name}

                  onChange={
                    handleFormChange
                  }

                  autoFocus

                />

              </label>


              {/* DESCRIÇÃO */}

              <label>

                Descrição

                <textarea

                  name="description"

                  placeholder="Ex: Cervejas Heineken"

                  value={
                    form.description
                  }

                  onChange={
                    handleFormChange
                  }

                />

              </label>


              {/* LOGO */}

              <label>

                URL da logo

                <input

                  type="text"

                  name="logo_url"

                  placeholder="https://..."

                  value={
                    form.logo_url
                  }

                  onChange={
                    handleFormChange
                  }

                />

              </label>


              {/* PREVIEW LOGO */}

              {form.logo_url && (

                <div className="brandLogoPreview">

                  <span>
                    Pré-visualização
                  </span>

                  <div>

                    <img

                      src={
                        form.logo_url
                      }

                      alt="Logo da marca"

                    />

                  </div>

                </div>

              )}


              {/* SITE */}

              <label>

                Site da marca

                <input

                  type="text"

                  name="website_url"

                  placeholder="https://..."

                  value={
                    form.website_url
                  }

                  onChange={
                    handleFormChange
                  }

                />

              </label>


              {/* DESTAQUE */}

              <label className="brandCheckbox">


                <input

                  type="checkbox"

                  name="featured"

                  checked={
                    form.featured
                  }

                  onChange={
                    handleFormChange
                  }

                />


                <div>

                  <strong>
                    Marca em destaque
                  </strong>

                  <span>
                    Exibir esta marca com maior prioridade no delivery.
                  </span>

                </div>


              </label>


              {/* ATIVA */}

              <label className="brandCheckbox">


                <input

                  type="checkbox"

                  name="active"

                  checked={
                    form.active
                  }

                  onChange={
                    handleFormChange
                  }

                />


                <div>

                  <strong>
                    Marca ativa
                  </strong>

                  <span>
                    Permite utilizar esta marca nos produtos.
                  </span>

                </div>


              </label>


              {/* =================================================
                  FOOTER
              ================================================= */}

              <div className="brandModalFooter">


                <button

                  type="button"

                  className="brandCancelButton"

                  onClick={closeModal}

                  disabled={saving}

                >

                  Cancelar

                </button>


                <button

                  type="submit"

                  className="adminPrimaryButton"

                  disabled={saving}

                >


                  {saving ? (

                    <>

                      <Loader2
                        size={16}
                        className="brandsSpinner"
                      />

                      Salvando...

                    </>

                  ) : editingBrand ? (

                    "Salvar Alterações"

                  ) : (

                    "Adicionar Marca"

                  )}


                </button>


              </div>


            </form>


          </div>


        </div>

      )}


    </section>

  );

}