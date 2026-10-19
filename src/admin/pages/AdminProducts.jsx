import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Barcode,
  Boxes,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import SimpleAdminTable from "../components/SimpleAdminTable";

import {
  addProductStock,
  createProduct,
  deleteProduct,
  getProductByBarcode,
  getProducts,
  getCategories,
  getActiveBrands,
  updateProduct,
} from "../services/adminService";

/* ============================================================
   HELPERS
============================================================ */

function money(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("pt-BR");
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  sku: "",
  barcode: "",
  unit: "UN",

  price: "",
  promotional_price: "",
  cost_price: "",

  stock: 0,
  minimum_stock: 0,

  image_url: "",
  brand_id: "",
  category_id: "",

  active: true,
  featured: false,
};

/* ============================================================
   COMPONENTE
============================================================ */

export default function AdminProducts() {
  const [searchParams]=useSearchParams();
  const handledIntent=useRef('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(()=>searchParams.get("category")||"");
  const [brandFilter, setBrandFilter] = useState("");

  const [expandedId, setExpandedId] =
    useState(null);

  /* CADASTRO / EDIÇÃO */

  const [productModal, setProductModal] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  /* ENTRADA DE ESTOQUE */

  const [stockModal, setStockModal] =
    useState(false);

  const [barcode, setBarcode] =
    useState("");

  const [stockProduct, setStockProduct] =
    useState(null);

  const [stockQuantity, setStockQuantity] =
    useState(1);

  const [stockNotes, setStockNotes] =
    useState("");

  const [searchingBarcode, setSearchingBarcode] =
    useState(false);

  const [addingStock, setAddingStock] =
    useState(false);

  const [barcodeSearched, setBarcodeSearched] =
    useState(false);

  const barcodeInputRef = useRef(null);

  /* ============================================================
     CARREGAR
  ============================================================ */

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const [data, categoriesData, brandsData] = await Promise.all([
        getProducts(),
        getCategories(),
        getActiveBrands(),
      ]);

      setProducts(data || []);
      setCategories(categoriesData || []);
      setBrands(brandsData || []);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Não foi possível carregar os produtos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  /* ============================================================
     BUSCA DA TABELA
  ============================================================ */

  const filteredProducts = useMemo(() => {
    const search = query
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch = !search || [
        product.name, product.sku, product.barcode, product.slug, product.description,
      ].filter(Boolean).join(" ").toLowerCase().includes(search);
      const matchesCategory = !categoryFilter || product.category_id === categoryFilter;
      const matchesBrand = !brandFilter || product.brand_id === brandFilter;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, query, categoryFilter, brandFilter]);

  /* ============================================================
     FORM
  ============================================================ */

  function changeForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewProduct(
    initialBarcode = ""
  ) {
    setEditingProduct(null);

    setForm({
      ...EMPTY_FORM,
      barcode: initialBarcode,
      category_id: categoryFilter||"",
    });

    setStockModal(false);
    setProductModal(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);

    setForm({
      name: product.name || "",
      slug: product.slug || "",
      description:
        product.description || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      unit: product.unit || "UN",

      price: product.price ?? "",

      promotional_price:
        product.promotional_price ?? "",

      cost_price:
        product.cost_price ?? "",

      stock: product.stock ?? 0,

      minimum_stock:
        product.minimum_stock ?? 0,

      image_url:
        product.image_url || "",

      brand_id:
        product.brand_id || "",

      category_id:
        product.category_id || "",

      active:
        product.active ?? true,

      featured:
        product.featured ?? false,
    });

    setProductModal(true);
  }

  useEffect(()=>{setCategoryFilter(searchParams.get('category')||'');},[searchParams]);
  useEffect(()=>{
    if(loading)return;
    const intent=searchParams.toString();
    if(handledIntent.current===intent)return;
    handledIntent.current=intent;
    const id=searchParams.get('edit');
    if(id){const product=products.find(p=>String(p.id)===id);if(product)openEditProduct(product);}
    else if(searchParams.get('new')==='1')openNewProduct();
  },[loading,products,searchParams]);

  /* ============================================================
     SALVAR PRODUTO
  ============================================================ */

  async function handleSaveProduct(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    if (
      form.price === "" ||
      Number(form.price) < 0
    ) {
      alert("Informe um preço válido.");
      return;
    }

    if (
      form.promotional_price !== "" &&
      Number(form.promotional_price) >
        Number(form.price)
    ) {
      alert(
        "O preço promocional não pode ser maior que o preço normal."
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        slug:
          form.slug.trim() ||
          slugify(form.name),

        description:
          form.description.trim() ||
          null,

        sku:
          form.sku.trim() ||
          null,

        barcode:
          form.barcode.trim() ||
          null,

        unit:
          form.unit.trim() ||
          "UN",

        price:
          Number(form.price),

        promotional_price:
          form.promotional_price === ""
            ? null
            : Number(
                form.promotional_price
              ),

        cost_price:
          form.cost_price === ""
            ? null
            : Number(
                form.cost_price
              ),

        stock:
          Math.max(
            0,
            Number(form.stock || 0)
          ),

        minimum_stock:
          Math.max(
            0,
            Number(
              form.minimum_stock || 0
            )
          ),

        image_url:
          form.image_url.trim() ||
          null,

        brand_id:
          form.brand_id.trim() ||
          null,

        category_id:
          form.category_id.trim() ||
          null,

        active:
          Boolean(form.active),

        featured:
          Boolean(form.featured),
      };

      if (editingProduct) {
        const updated =
          await updateProduct(
            editingProduct.id,
            payload
          );

        setProducts((current) =>
          current.map((product) =>
            product.id === updated.id
              ? updated
              : product
          )
        );
      } else {
        /*
          Segurança adicional:
          se informou código de barras,
          verificamos novamente antes do INSERT.
        */

        if (payload.barcode) {
          const existing =
            await getProductByBarcode(
              payload.barcode
            );

          if (existing) {
            alert(
              `Este código de barras já pertence a "${existing.name}".\n\nUse Entrada de Estoque para adicionar unidades.`
            );

            return;
          }
        }

        const created =
          await createProduct(payload);

        setProducts((current) =>
          [...current, created].sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                "pt-BR"
              )
          )
        );
      }

      setProductModal(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Não foi possível salvar o produto."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     EXCLUIR
  ============================================================ */

  async function handleDelete(product) {
    const confirmed =
      window.confirm(
        `Deseja realmente excluir "${product.name}"?\n\nEssa ação não poderá ser desfeita.`
      );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);

      await deleteProduct(product.id);

      setProducts((current) =>
        current.filter(
          (item) =>
            item.id !== product.id
        )
      );

      if (
        expandedId === product.id
      ) {
        setExpandedId(null);
      }
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Não foi possível excluir o produto."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ============================================================
     ENTRADA DE ESTOQUE
  ============================================================ */

  function openStockModal() {
    setBarcode("");
    setStockProduct(null);
    setStockQuantity(1);
    setStockNotes("");
    setBarcodeSearched(false);

    setStockModal(true);

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }

  async function searchBarcode() {
    const code =
      barcode.trim();

    if (!code) {
      alert(
        "Digite ou leia um código de barras."
      );

      barcodeInputRef.current?.focus();

      return;
    }

    try {
      setSearchingBarcode(true);
      setBarcodeSearched(true);
      setStockProduct(null);

      const product =
        await getProductByBarcode(code);

      if (product) {
        setStockProduct(product);
        setStockQuantity(1);
      }
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Erro ao localizar produto."
      );
    } finally {
      setSearchingBarcode(false);
    }
  }

  function handleBarcodeKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      searchBarcode();
    }
  }

  function addQuickQuantity(quantity) {
    setStockQuantity((current) =>
      Math.max(
        1,
        Number(current || 0) +
          quantity
      )
    );
  }

  async function handleAddStock() {
    if (!stockProduct) {
      return;
    }

    const quantity =
      Number(stockQuantity);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Informe uma quantidade válida."
      );

      return;
    }

    try {
      setAddingStock(true);

      const updated =
        await addProductStock(
          stockProduct.id,
          quantity,
          stockNotes.trim() ||
            `Entrada via código de barras ${stockProduct.barcode || ""}`
        );

      setProducts((current) =>
        current.map((product) =>
          product.id === updated.id
            ? updated
            : product
        )
      );

      /*
        Mantemos o produto na tela,
        mas atualizamos o estoque.
      */

      setStockProduct(updated);

      alert(
        `Entrada realizada!\n\n${updated.name}\n+${quantity} unidades\nNovo estoque: ${updated.stock}`
      );

      /*
        Prepara imediatamente para
        o próximo código de barras.
      */

      setBarcode("");
      setStockProduct(null);
      setStockQuantity(1);
      setStockNotes("");
      setBarcodeSearched(false);

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Não foi possível adicionar o estoque."
      );
    } finally {
      setAddingStock(false);
    }
  }

  /* ============================================================
     COLUNAS
  ============================================================ */

  const columns = [
    {
      key: "image_url",
      label: "",

      render: (value, product) => (
        <div className="adminProductImage">
          {value ? (
            <img
              src={value}
              alt={product.name}
            />
          ) : (
            <div className="adminProductImageEmpty">
              <Package size={21} />
            </div>
          )}
        </div>
      ),
    },

    {
      key: "name",
      label: "Produto",

      render: (value, product) => (
        <div className="adminProductMain">
          <strong>
            {value}
          </strong>

          <span>
            {product.barcode
              ? `Cód. ${product.barcode}`
              : product.sku
              ? `SKU ${product.sku}`
              : "Sem código"}
          </span>
        </div>
      ),
    },

    {
      key: "stock",
      label: "Estoque",

      render: (value, product) => {
        const low =
          Number(value) <=
          Number(
            product.minimum_stock ||
              0
          );

        return (
          <div
            className={`adminProductStock ${
              low ? "low" : ""
            }`}
          >
            {low && (
              <AlertTriangle
                size={14}
              />
            )}

            <strong>
              {value}{" "}
              {product.unit ||
                "UN"}
            </strong>
          </div>
        );
      },
    },

    {
      key: "cost_price",
      label: "Custo",

      render: (value) =>
        money(value),
    },

    {
      key: "price",
      label: "Venda",

      render: (value) => (
        <strong>
          {money(value)}
        </strong>
      ),
    },

    {
      key: "promotional_price",
      label: "Promoção",

      render: (value) =>
        value === null ? (
          <span className="mutedValue">
            —
          </span>
        ) : (
          <strong>
            {money(value)}
          </strong>
        ),
    },

    {
      key: "active",
      label: "Status",

      render: (value) => (
        <span
          className={`productStatus ${
            value
              ? "active"
              : "inactive"
          }`}
        >
          {value
            ? "Ativo"
            : "Inativo"}
        </span>
      ),
    },

    {
      key: "actions",
      label: "",

      render: (_, product) => (
        <div className="tableActions">

          <button
            type="button"
            className="adminDetailsButton"
            onClick={() =>
              setExpandedId(
                expandedId ===
                  product.id
                  ? null
                  : product.id
              )
            }
          >
            {expandedId ===
            product.id ? (
              <ChevronUp
                size={14}
              />
            ) : (
              <ChevronDown
                size={14}
              />
            )}

            Detalhes
          </button>

          <button
            type="button"
            className="tableIconButton"
            title="Editar produto"
            onClick={() =>
              openEditProduct(
                product
              )
            }
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            className="tableIconButton danger"
            title="Excluir produto"
            disabled={
              deletingId ===
              product.id
            }
            onClick={() =>
              handleDelete(
                product
              )
            }
          >
            {deletingId ===
            product.id ? (
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

  const expandedProduct =
    products.find(
      (product) =>
        product.id === expandedId
    );

  /* ============================================================
     RETURN
  ============================================================ */

  return (
    <section className="adminPage">

      <PageHeader
        eyebrow="Bebidas"
        title="Produtos"
        description={`${products.length} produtos cadastrados.`}
        action={
          <div className="productHeaderActions">

            <button
              type="button"
              className="stockEntryButton"
              onClick={
                openStockModal
              }
            >
              <Barcode size={17} />

              Entrada de Estoque
            </button>

            <button
              type="button"
              className="adminPrimaryButton"
              onClick={() =>
                openNewProduct()
              }
            >
              <Plus size={16} />

              Novo Produto
            </button>

          </div>
        }
      />

      <div className="ux-book">Fotos do catálogo já estão no projeto. <Link to="/admin/catalog">Abrir biblioteca de fotos</Link> para associar imagens aos produtos existentes.</div>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div className="adminToolbar">

        <label className="adminSearch">

          <Search size={16} />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Buscar produto, SKU ou código de barras..."
          />

        </label>

        <select className="catalogFilterSelect" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>

        <select className="catalogFilterSelect" value={brandFilter} onChange={(e)=>setBrandFilter(e.target.value)}>
          <option value="">Todas as marcas</option>
          {brands.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>

        <button
          type="button"
          className="tableIconButton"
          onClick={loadProducts}
          title="Atualizar"
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

      {/* ======================================================
          ERRO
      ====================================================== */}

      {error && (
        <div className="productError">

          <AlertTriangle
            size={18}
          />

          {error}

        </div>
      )}

      {/* ======================================================
          TABELA
      ====================================================== */}

      {loading ? (
        <div className="productLoading">

          <Loader2
            size={28}
            className="spin"
          />

          Carregando produtos...

        </div>
      ) : (
        <SimpleAdminTable
          rows={filteredProducts}
          columns={columns}
          emptyText="Nenhum produto encontrado."
        />
      )}

      {/* ======================================================
          DETALHES
      ====================================================== */}

      {expandedProduct && (
        <div className="productDetailsCard">

          <div className="productDetailsHeader">

            <div>
              <span>
                DETALHES
              </span>

              <h3>
                {
                  expandedProduct.name
                }
              </h3>
            </div>

            <button
              type="button"
              className="tableIconButton"
              onClick={() =>
                setExpandedId(null)
              }
            >
              <X size={17} />
            </button>

          </div>

          <div className="productDetailsGrid">

            <Detail
              label="Código de barras"
              value={
                expandedProduct.barcode ||
                "—"
              }
            />

            <Detail
              label="SKU"
              value={
                expandedProduct.sku ||
                "—"
              }
            />

            <Detail
              label="Preço de venda"
              value={money(
                expandedProduct.price
              )}
            />

            <Detail
              label="Preço promocional"
              value={money(
                expandedProduct.promotional_price
              )}
            />

            <Detail
              label="Preço de custo"
              value={money(
                expandedProduct.cost_price
              )}
            />

            <Detail
              label="Estoque"
              value={`${expandedProduct.stock} ${expandedProduct.unit}`}
            />

            <Detail
              label="Estoque mínimo"
              value={
                expandedProduct.minimum_stock
              }
            />

            <Detail
              label="Unidade"
              value={
                expandedProduct.unit
              }
            />

            <Detail
              label="Slug"
              value={
                expandedProduct.slug
              }
            />

            <Detail
              label="Status"
              value={
                expandedProduct.active
                  ? "Ativo"
                  : "Inativo"
              }
            />

            <Detail
              label="Criado"
              value={dateTime(
                expandedProduct.created_at
              )}
            />

            <Detail
              label="Atualizado"
              value={dateTime(
                expandedProduct.updated_at
              )}
            />

          </div>

          <div className="productDescription">

            <span>
              DESCRIÇÃO
            </span>

            <p>
              {expandedProduct.description ||
                "Nenhuma descrição cadastrada."}
            </p>

          </div>

        </div>
      )}

      {/* ======================================================
          MODAL ENTRADA DE ESTOQUE
      ====================================================== */}

      {stockModal && (
        <div className="productModalOverlay">

          <div className="stockModal">

            <div className="productModalHeader">

              <div>
                <small>
                  ESTOQUE
                </small>

                <h2>
                  Entrada de Estoque
                </h2>

                <p>
                  Leia ou digite o código
                  de barras do produto.
                </p>
              </div>

              <button
                type="button"
                className="tableIconButton"
                onClick={() =>
                  setStockModal(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="stockModalBody">

              <label className="barcodeField">

                <span>
                  Código de barras
                </span>

                <div className="barcodeInput">

                  <Barcode
                    size={20}
                  />

                  <input
                    ref={
                      barcodeInputRef
                    }
                    value={barcode}
                    onChange={(
                      event
                    ) => {
                      setBarcode(
                        event.target
                          .value
                      );

                      setStockProduct(
                        null
                      );

                      setBarcodeSearched(
                        false
                      );
                    }}
                    onKeyDown={
                      handleBarcodeKeyDown
                    }
                    placeholder="Digite ou passe o leitor..."
                    autoComplete="off"
                  />

                  <button
                    type="button"
                    onClick={
                      searchBarcode
                    }
                    disabled={
                      searchingBarcode
                    }
                  >
                    {searchingBarcode ? (
                      <Loader2
                        size={16}
                        className="spin"
                      />
                    ) : (
                      <Search
                        size={16}
                      />
                    )}

                    Buscar
                  </button>

                </div>

              </label>

              {/* PRODUTO ENCONTRADO */}

              {stockProduct && (
                <div className="stockProductFound">

                  <div className="stockFoundHeader">

                    <div className="stockProductIcon">
                      <Package
                        size={25}
                      />
                    </div>

                    <div>
                      <span>
                        PRODUTO ENCONTRADO
                      </span>

                      <h3>
                        {
                          stockProduct.name
                        }
                      </h3>

                      <p>
                        Código:{" "}
                        {stockProduct.barcode}
                      </p>
                    </div>

                  </div>

                  <div className="stockCurrent">

                    <span>
                      Estoque atual
                    </span>

                    <strong>
                      {
                        stockProduct.stock
                      }{" "}
                      {
                        stockProduct.unit
                      }
                    </strong>

                  </div>

                  <div className="stockQuantityArea">

                    <span>
                      QUANTIDADE RECEBIDA
                    </span>

                    <div className="quantityControl">

                      <button
                        type="button"
                        onClick={() =>
                          setStockQuantity(
                            (current) =>
                              Math.max(
                                1,
                                Number(
                                  current ||
                                    1
                                ) - 1
                              )
                          )
                        }
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          stockQuantity
                        }
                        onChange={(
                          event
                        ) =>
                          setStockQuantity(
                            event.target
                              .value
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          addQuickQuantity(
                            1
                          )
                        }
                      >
                        +
                      </button>

                    </div>

                    <div className="quickQuantities">

                      <button
                        type="button"
                        onClick={() =>
                          addQuickQuantity(
                            1
                          )
                        }
                      >
                        +1
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addQuickQuantity(
                            6
                          )
                        }
                      >
                        +6
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addQuickQuantity(
                            12
                          )
                        }
                      >
                        +12
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addQuickQuantity(
                            24
                          )
                        }
                      >
                        +24
                      </button>

                    </div>

                  </div>

                  <div className="stockPreview">

                    <span>
                      Estoque após entrada
                    </span>

                    <strong>
                      {Number(
                        stockProduct.stock
                      ) +
                        Number(
                          stockQuantity ||
                            0
                        )}{" "}
                      {
                        stockProduct.unit
                      }
                    </strong>

                  </div>

                  <label className="stockNotes">

                    <span>
                      Observação
                    </span>

                    <input
                      value={
                        stockNotes
                      }
                      onChange={(
                        event
                      ) =>
                        setStockNotes(
                          event.target
                            .value
                        )
                      }
                      placeholder="Ex.: Recebimento fornecedor"
                    />

                  </label>

                  <button
                    type="button"
                    className="stockConfirmButton"
                    disabled={
                      addingStock
                    }
                    onClick={
                      handleAddStock
                    }
                  >

                    {addingStock ? (
                      <Loader2
                        size={18}
                        className="spin"
                      />
                    ) : (
                      <Boxes
                        size={18}
                      />
                    )}

                    {addingStock
                      ? "Adicionando..."
                      : `Adicionar ${stockQuantity || 0} ao estoque`}

                  </button>

                </div>
              )}

              {/* NÃO ENCONTRADO */}

              {barcodeSearched &&
                !searchingBarcode &&
                !stockProduct && (
                  <div className="productNotFound">

                    <AlertTriangle
                      size={28}
                    />

                    <h3>
                      Produto não
                      cadastrado
                    </h3>

                    <p>
                      Nenhum produto foi
                      encontrado com o
                      código
                      <strong>
                        {" "}
                        {barcode}
                      </strong>
                      .
                    </p>

                    <button
                      type="button"
                      className="adminPrimaryButton"
                      onClick={() =>
                        openNewProduct(
                          barcode.trim()
                        )
                      }
                    >
                      <Plus
                        size={16}
                      />

                      Cadastrar este
                      produto
                    </button>

                  </div>
                )}

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          MODAL NOVO / EDITAR
      ====================================================== */}

      {productModal && (
        <div className="productModalOverlay">

          <div className="productModal">

            <div className="productModalHeader">

              <div>
                <small>
                  PRODUTOS
                </small>

                <h2>
                  {editingProduct
                    ? "Editar Produto"
                    : "Novo Produto"}
                </h2>

                <p>
                  {editingProduct
                    ? "Atualize as informações do produto."
                    : "Cadastre um novo produto no catálogo."}
                </p>
              </div>

              <button
                type="button"
                className="tableIconButton"
                onClick={() =>
                  setProductModal(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={
                handleSaveProduct
              }
            >

              <div className="productFormGrid">

                <FormField
                  label="Nome *"
                  value={form.name}
                  onChange={(value) =>
                    changeForm(
                      "name",
                      value
                    )
                  }
                />

                <FormField
                  label="Código de barras"
                  value={
                    form.barcode
                  }
                  onChange={(value) =>
                    changeForm(
                      "barcode",
                      value
                    )
                  }
                />

                <FormField
                  label="SKU"
                  value={form.sku}
                  onChange={(value) =>
                    changeForm(
                      "sku",
                      value
                    )
                  }
                />

                <FormField
                  label="Unidade"
                  value={form.unit}
                  onChange={(value) =>
                    changeForm(
                      "unit",
                      value
                    )
                  }
                />

                <FormField
                  label="Preço de custo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    form.cost_price
                  }
                  onChange={(value) =>
                    changeForm(
                      "cost_price",
                      value
                    )
                  }
                />

                <FormField
                  label="Preço de venda *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(value) =>
                    changeForm(
                      "price",
                      value
                    )
                  }
                />

                <FormField
                  label="Desconto no card (%)"
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  value={Number(form.price)>0 && form.promotional_price!=="" ? Math.round((1-Number(form.promotional_price)/Number(form.price))*10000)/100 : ""}
                  onChange={(value)=>changeForm("promotional_price",value===""||Number(value)===0?"":(Number(form.price)*(1-Math.min(99.99,Math.max(0,Number(value)))/100)).toFixed(2))}
                />
                <p className="ux-muted">Informe a porcentagem ou o preço promocional abaixo. O selo no card é calculado automaticamente pelo preço final.</p>
                <FormField
                  label="Preço promocional"
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    form.promotional_price
                  }
                  onChange={(value) =>
                    changeForm(
                      "promotional_price",
                      value
                    )
                  }
                />

                <FormField
                  label="Estoque inicial"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(value) =>
                    changeForm(
                      "stock",
                      value
                    )
                  }
                />

                <FormField
                  label="Estoque mínimo"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    form.minimum_stock
                  }
                  onChange={(value) =>
                    changeForm(
                      "minimum_stock",
                      value
                    )
                  }
                />

                <SelectField
                  label="Categoria *"
                  value={form.category_id}
                  onChange={(value) => changeForm("category_id", value)}
                  options={categories.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Selecione a categoria"
                />

                <SelectField
                  label="Marca"
                  value={form.brand_id}
                  onChange={(value) => changeForm("brand_id", value)}
                  options={brands.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Selecione a marca"
                />

                <FormField
                  label="URL da imagem"
                  value={
                    form.image_url
                  }
                  onChange={(value) =>
                    changeForm(
                      "image_url",
                      value
                    )
                  }
                />

                <FormField
                  label="Slug"
                  value={form.slug}
                  placeholder="Gerado automaticamente"
                  onChange={(value) =>
                    changeForm(
                      "slug",
                      value
                    )
                  }
                />

              </div>

              <label className="productDescriptionField">

                <span>
                  Descrição
                </span>

                <textarea
                  rows="4"
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    changeForm(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Descrição do produto..."
                />

              </label>

              <div className="productChecks">

                <label>
                  <input
                    type="checkbox"
                    checked={
                      form.active
                    }
                    onChange={(event) =>
                      changeForm(
                        "active",
                        event.target
                          .checked
                      )
                    }
                  />

                  Produto ativo
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      form.featured
                    }
                    onChange={(event) =>
                      changeForm(
                        "featured",
                        event.target
                          .checked
                      )
                    }
                  />

                  Produto em destaque
                </label>

              </div>

              <div className="productModalFooter">

                <button
                  type="button"
                  className="productCancelButton"
                  onClick={() =>
                    setProductModal(
                      false
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="adminPrimaryButton"
                  disabled={saving}
                >

                  {saving && (
                    <Loader2
                      size={16}
                      className="spin"
                    />
                  )}

                  {saving
                    ? "Salvando..."
                    : editingProduct
                    ? "Salvar alterações"
                    : "Cadastrar produto"}

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
   AUXILIARES
============================================================ */

function Detail({
  label,
  value,
}) {
  return (
    <div className="productDetailItem">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  step,
  min,
  max,
  placeholder,
}) {
  return (
    <label className="productFormField">

      <span>
        {label}
      </span>

      <input
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />

    </label>
  );
}

function SelectField({ label, value, onChange, options = [], placeholder }) {
  return (
    <label className="productFormField">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder || "Selecione"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
