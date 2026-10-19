import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  FolderOpen,
  Image,
  Layers3,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import SimpleAdminTable from "../components/SimpleAdminTable";

import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryProductCounts,
  toggleCategoryStatus,
  updateCategory,
} from "../services/adminService";

/* ============================================================
   HELPERS
============================================================ */

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  icon: "",
  display_order: 0,
  active: true,
};

/* ============================================================
   COMPONENTE
============================================================ */

export default function AdminCategories() {
  const [categories, setCategories] =
    useState([]);

  const [productCounts, setProductCounts] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [changingStatusId, setChangingStatusId] =
    useState(null);

  /* ==========================================================
     CARREGAMENTO
  ========================================================== */

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const [
        categoriesData,
        countsData,
      ] = await Promise.all([
        getCategories(),
        getCategoryProductCounts(),
      ]);

      setCategories(
        categoriesData || []
      );

      setProductCounts(
        countsData || {}
      );
    } catch (err) {
      console.error(
        "Erro categorias:",
        err
      );

      setError(
        err?.message ||
          "Não foi possível carregar as categorias."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  /* ==========================================================
     ESTATÍSTICAS
  ========================================================== */

  const totalCategories =
    categories.length;

  const activeCategories =
    categories.filter(
      (category) =>
        category.active
    ).length;

  const inactiveCategories =
    categories.filter(
      (category) =>
        !category.active
    ).length;

  const totalCategorizedProducts =
    Object.values(
      productCounts
    ).reduce(
      (total, value) =>
        total + Number(value || 0),
      0
    );

  /* ==========================================================
     PESQUISA
  ========================================================== */

  const filteredCategories =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      if (!search) {
        return categories;
      }

      return categories.filter(
        (category) =>
          [
            category.name,
            category.slug,
            category.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search)
      );
    }, [
      categories,
      query,
    ]);

  /* ==========================================================
     FORM
  ========================================================== */

  function changeForm(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewCategory() {
    setEditingCategory(null);

    const nextOrder =
      categories.length > 0
        ? Math.max(
            ...categories.map(
              (category) =>
                Number(
                  category.display_order ||
                    0
                )
            )
          ) + 1
        : 1;

    setForm({
      ...EMPTY_FORM,
      display_order:
        nextOrder,
    });

    setModalOpen(true);
  }

  function openEditCategory(
    category
  ) {
    setEditingCategory(
      category
    );

    setForm({
      name:
        category.name || "",

      slug:
        category.slug || "",

      description:
        category.description ||
        "",

      image_url:
        category.image_url ||
        "",

      icon:
        category.icon || "",

      display_order:
        category.display_order ??
        0,

      active:
        category.active ??
        true,
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);

    setEditingCategory(null);

    setForm(EMPTY_FORM);
  }

  /* ==========================================================
     SALVAR
  ========================================================== */

  async function handleSave(
    event
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert(
        "Informe o nome da categoria."
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name:
          form.name.trim(),

        slug:
          form.slug.trim() ||
          slugify(form.name),

        description:
          form.description.trim() ||
          null,

        image_url:
          form.image_url.trim() ||
          null,

        icon:
          form.icon.trim() ||
          null,

        display_order:
          Math.max(
            0,
            Number(
              form.display_order ||
                0
            )
          ),

        active:
          Boolean(form.active),
      };

      if (editingCategory) {
        const updated =
          await updateCategory(
            editingCategory.id,
            payload
          );

        setCategories(
          (current) =>
            current
              .map(
                (category) =>
                  category.id ===
                  updated.id
                    ? updated
                    : category
              )
              .sort(
                (a, b) =>
                  Number(
                    a.display_order
                  ) -
                  Number(
                    b.display_order
                  )
              )
        );
      } else {
        const created =
          await createCategory(
            payload
          );

        setCategories(
          (current) =>
            [
              ...current,
              created,
            ].sort(
              (a, b) =>
                Number(
                  a.display_order
                ) -
                Number(
                  b.display_order
                )
            )
        );

        setProductCounts(
          (current) => ({
            ...current,
            [created.id]: 0,
          })
        );
      }

      closeModal();

      setModalOpen(false);

      setEditingCategory(
        null
      );

      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);

      if (
        err?.code ===
        "23505"
      ) {
        alert(
          "Já existe uma categoria utilizando este slug."
        );
      } else {
        alert(
          err?.message ||
            "Não foi possível salvar a categoria."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     STATUS
  ========================================================== */

  async function handleToggleStatus(
    category
  ) {
    try {
      setChangingStatusId(
        category.id
      );

      const updated =
        await toggleCategoryStatus(
          category.id,
          !category.active
        );

      setCategories(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updated.id
                ? updated
                : item
          )
      );
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Não foi possível alterar o status."
      );
    } finally {
      setChangingStatusId(
        null
      );
    }
  }

  /* ==========================================================
     EXCLUIR
  ========================================================== */

  async function handleDelete(
    category
  ) {
    const products =
      productCounts[
        category.id
      ] || 0;

    if (products > 0) {
      alert(
        `"${category.name}" possui ${products} produto(s).\n\nMova esses produtos para outra categoria antes de excluir.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Excluir a categoria "${category.name}"?\n\nEssa ação não poderá ser desfeita.`
      );

    if (!confirmed) return;

    try {
      setDeletingId(
        category.id
      );

      await deleteCategory(
        category.id
      );

      setCategories(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              category.id
          )
      );
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Não foi possível excluir a categoria."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ==========================================================
     COLUNAS
  ========================================================== */

  const columns = [
    {
      key: "display_order",
      label: "Ordem",

      render: (value) => (
        <div className="categoryOrder">
          {String(
            value
          ).padStart(
            2,
            "0"
          )}
        </div>
      ),
    },

    {
      key: "image_url",
      label: "",

      render: (
        value,
        category
      ) => (
        <div className="categoryImage">

          {value ? (
            <img
              src={value}
              alt={
                category.name
              }
            />
          ) : (
            <div className="categoryImageEmpty">
              <FolderOpen
                size={21}
              />
            </div>
          )}

        </div>
      ),
    },

    {
      key: "name",
      label: "Categoria",

      render: (
        value,
        category
      ) => (
        <div className="categoryMain">

          <strong>
            {value}
          </strong>

          <span>
            /{category.slug}
          </span>

          {category.description && (
            <small>
              {
                category.description
              }
            </small>
          )}

        </div>
      ),
    },

    {
      key: "products",
      label: "Produtos",

      render: (
        _,
        category
      ) => {
        const count =
          productCounts[
            category.id
          ] || 0;

        return (
          <div className="categoryProducts">

            <Package
              size={14}
            />

            <strong>
              {count}
            </strong>

            <span>
              {count === 1
                ? "produto"
                : "produtos"}
            </span>

          </div>
        );
      },
    },

    {
      key: "active",
      label: "Status",

      render: (
        value,
        category
      ) => (
        <button
          type="button"
          className={`categoryStatus ${
            value
              ? "active"
              : "inactive"
          }`}
          disabled={
            changingStatusId ===
            category.id
          }
          onClick={() =>
            handleToggleStatus(
              category
            )
          }
        >

          {changingStatusId ===
          category.id ? (
            <Loader2
              size={13}
              className="spin"
            />
          ) : value ? (
            <Check
              size={13}
            />
          ) : (
            <EyeOff
              size={13}
            />
          )}

          {value
            ? "Ativa"
            : "Inativa"}

        </button>
      ),
    },

    {
      key: "actions",
      label: "",

      render: (
        _,
        category
      ) => (
        <div className="tableActions">

          <button
            type="button"
            className="tableIconButton"
            title="Editar categoria"
            onClick={() =>
              openEditCategory(
                category
              )
            }
          >
            <Pencil
              size={15}
            />
          </button>

          <button
            type="button"
            className="tableIconButton danger"
            title="Excluir categoria"
            disabled={
              deletingId ===
              category.id
            }
            onClick={() =>
              handleDelete(
                category
              )
            }
          >
            {deletingId ===
            category.id ? (
              <Loader2
                size={15}
                className="spin"
              />
            ) : (
              <Trash2
                size={15}
              />
            )}
          </button>

        </div>
      ),
    },
  ];

  /* ==========================================================
     RETURN
  ========================================================== */

  return (
    <section className="adminPage">

      <PageHeader
        eyebrow="Cardápio"
        title="Categorias"
        description="Organize a estrutura do seu catálogo e controle como as categorias aparecem na loja."
        action={
          <button
            type="button"
            className="adminPrimaryButton"
            onClick={
              openNewCategory
            }
          >
            <Plus size={16} />

            Nova Categoria
          </button>
        }
      />

      {/* ====================================================
          CARDS
      ==================================================== */}

      <div className="categoryStats">

        <CategoryStat
          icon={
            <Layers3
              size={19}
            />
          }
          label="Categorias"
          value={
            totalCategories
          }
          description="Total cadastrado"
        />

        <CategoryStat
          icon={
            <Eye
              size={19}
            />
          }
          label="Ativas"
          value={
            activeCategories
          }
          description="Visíveis na loja"
        />

        <CategoryStat
          icon={
            <EyeOff
              size={19}
            />
          }
          label="Inativas"
          value={
            inactiveCategories
          }
          description="Ocultas da loja"
        />

        <CategoryStat
          icon={
            <Package
              size={19}
            />
          }
          label="Produtos"
          value={
            totalCategorizedProducts
          }
          description="Com categoria"
        />

      </div>

      {/* ====================================================
          TOOLBAR
      ==================================================== */}

      <div className="adminToolbar">

        <label className="adminSearch">

          <Search
            size={16}
          />

          <input
            value={query}
            onChange={(
              event
            ) =>
              setQuery(
                event.target
                  .value
              )
            }
            placeholder="Buscar categoria..."
          />

        </label>

        <button
          type="button"
          className="tableIconButton"
          title="Atualizar"
          onClick={
            loadCategories
          }
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "spin"
                : ""
            }
          />
        </button>

      </div>

      {/* ====================================================
          ERRO
      ==================================================== */}

      {error && (
        <div className="categoryError">

          <AlertTriangle
            size={18}
          />

          <div>
            <strong>
              Não foi possível carregar as categorias.
            </strong>

            <span>
              {error}
            </span>
          </div>

        </div>
      )}

      {/* ====================================================
          TABELA
      ==================================================== */}

      {loading ? (
        <div className="categoryLoading">

          <Loader2
            size={27}
            className="spin"
          />

          <span>
            Carregando categorias...
          </span>

        </div>
      ) : (
        <SimpleAdminTable
          rows={
            filteredCategories
          }
          columns={
            columns
          }
          emptyText="Nenhuma categoria encontrada."
        />
      )}

      {/* ====================================================
          MODAL
      ==================================================== */}

      {modalOpen && (
        <div className="categoryModalOverlay">

          <div className="categoryModal">

            <div className="categoryModalHeader">

              <div className="categoryModalTitle">

                <div className="categoryModalIcon">
                  <Layers3
                    size={21}
                  />
                </div>

                <div>
                  <span>
                    CARDÁPIO
                  </span>

                  <h2>
                    {editingCategory
                      ? "Editar Categoria"
                      : "Nova Categoria"}
                  </h2>

                  <p>
                    {editingCategory
                      ? "Atualize as informações e a exibição desta categoria."
                      : "Crie uma nova seção para organizar seus produtos."}
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="tableIconButton"
                onClick={
                  closeModal
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>

            <form
              onSubmit={
                handleSave
              }
            >

              <div className="categoryFormGrid">

                <CategoryField
                  label="Nome da categoria *"
                  value={
                    form.name
                  }
                  placeholder="Ex.: Cervejas"
                  onChange={(
                    value
                  ) => {
                    changeForm(
                      "name",
                      value
                    );

                    /*
                      Em nova categoria,
                      acompanha o nome.
                    */

                    if (
                      !editingCategory
                    ) {
                      changeForm(
                        "slug",
                        slugify(
                          value
                        )
                      );
                    }
                  }}
                />

                <CategoryField
                  label="Slug"
                  value={
                    form.slug
                  }
                  placeholder="cervejas"
                  onChange={(
                    value
                  ) =>
                    changeForm(
                      "slug",
                      value
                    )
                  }
                />

                <CategoryField
                  label="Ordem de exibição"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    form.display_order
                  }
                  onChange={(
                    value
                  ) =>
                    changeForm(
                      "display_order",
                      value
                    )
                  }
                />

                <CategoryField
                  label="Ícone"
                  value={
                    form.icon
                  }
                  placeholder="Ex.: beer"
                  onChange={(
                    value
                  ) =>
                    changeForm(
                      "icon",
                      value
                    )
                  }
                />

              </div>

              {/* IMAGEM */}

              <div className="categoryImageField">

                <div className="categoryImagePreview">

                  {form.image_url ? (
                    <img
                      src={
                        form.image_url
                      }
                      alt="Preview"
                    />
                  ) : (
                    <Image
                      size={25}
                    />
                  )}

                </div>

                <CategoryField
                  label="URL da imagem"
                  value={
                    form.image_url
                  }
                  placeholder="https://..."
                  onChange={(
                    value
                  ) =>
                    changeForm(
                      "image_url",
                      value
                    )
                  }
                />

              </div>

              {/* DESCRIÇÃO */}

              <label className="categoryDescriptionField">

                <span>
                  Descrição
                </span>

                <textarea
                  rows="4"
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    changeForm(
                      "description",
                      event.target
                        .value
                    )
                  }
                  placeholder="Descreva brevemente os produtos desta categoria..."
                />

              </label>

              {/* STATUS */}

              <div className="categoryVisibility">

                <div>

                  <strong>
                    Categoria ativa
                  </strong>

                  <span>
                    Quando ativa, a categoria pode ser exibida na loja.
                  </span>

                </div>

                <label className="categorySwitch">

                  <input
                    type="checkbox"
                    checked={
                      form.active
                    }
                    onChange={(
                      event
                    ) =>
                      changeForm(
                        "active",
                        event.target
                          .checked
                      )
                    }
                  />

                  <span />

                </label>

              </div>

              {/* FOOTER */}

              <div className="categoryModalFooter">

                <button
                  type="button"
                  className="categoryCancelButton"
                  onClick={
                    closeModal
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="adminPrimaryButton"
                  disabled={
                    saving
                  }
                >

                  {saving && (
                    <Loader2
                      size={16}
                      className="spin"
                    />
                  )}

                  {saving
                    ? "Salvando..."
                    : editingCategory
                    ? "Salvar alterações"
                    : "Criar categoria"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </section>
  );
}

/* ============================================================
   COMPONENTES AUXILIARES
============================================================ */

function CategoryStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="categoryStatCard">

      <div className="categoryStatIcon">
        {icon}
      </div>

      <div className="categoryStatContent">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </div>
  );
}

function CategoryField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  step,
}) {
  return (
    <label className="categoryFormField">

      <span>
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={
          placeholder
        }
        min={min}
        step={step}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
      />

    </label>
  );
}