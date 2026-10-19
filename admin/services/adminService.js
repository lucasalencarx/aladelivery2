import { supabase } from "../../supabase/supabase";


// ============================================================
// PRODUTOS
// ============================================================

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    throw error;
  }

  return data || [];
}


export async function getProductById(id) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}


export async function createProduct(product) {
  const payload = {
    ...product,

    category_id:
      product.category_id || null,

    brand_id:
      product.brand_id || null,

    price:
      Number(product.price || 0),

    promotional_price:
      product.promotional_price === "" ||
      product.promotional_price == null
        ? null
        : Number(product.promotional_price),

    cost_price:
      product.cost_price === "" ||
      product.cost_price == null
        ? null
        : Number(product.cost_price),

    stock:
      Number(product.stock || 0),

    minimum_stock:
      Number(product.minimum_stock || 0),
  };

  const { data, error } = await supabase
    .from("products")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar produto:", error);
    throw error;
  }

  return data;
}


export async function updateProduct(id, product) {
  const payload = {
    ...product,

    category_id:
      product.category_id || null,

    brand_id:
      product.brand_id || null,
  };

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar produto:", error);
    throw error;
  }

  return data;
}


export async function deleteProduct(id) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}


export async function toggleProductStatus(id, active) {
  const { data, error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}


// ============================================================
// CÓDIGO DE BARRAS
// ============================================================

export async function getProductByBarcode(barcode) {
  const code = String(barcode || "").trim();

  if (!code) return null;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", code)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}


// ============================================================
// ESTOQUE
// ============================================================

export async function updateProductStock(id, stock) {
  const quantity = Number(stock);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Estoque inválido.");
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      stock: quantity,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function addProductStock(id, quantity) {
  const amount = Number(quantity);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Quantidade inválida.");
  }

  const { data: product, error } =
    await supabase
      .from("products")
      .select("id, stock")
      .eq("id", id)
      .single();

  if (error) throw error;

  return updateProductStock(
    id,
    Number(product.stock || 0) + amount
  );
}


export async function addStockByBarcode(
  barcode,
  quantity = 1
) {
  const product =
    await getProductByBarcode(barcode);

  if (!product) {
    throw new Error(
      "Produto não encontrado."
    );
  }

  return addProductStock(
    product.id,
    quantity
  );
}


// ============================================================
// CATEGORIAS
// ============================================================

export async function getCategories() {
  const [
    categoriesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("display_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("products")
      .select("id, category_id"),
  ]);

  if (categoriesResult.error) {
    console.error(
      "Erro ao carregar categorias:",
      categoriesResult.error
    );

    throw categoriesResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  const counts = {};

  (productsResult.data || []).forEach(
    (product) => {
      if (!product.category_id) return;

      counts[product.category_id] =
        (counts[product.category_id] || 0) + 1;
    }
  );

  return (categoriesResult.data || []).map(
    (category) => ({
      ...category,

      products_count:
        counts[category.id] || 0,

      products:
        counts[category.id] || 0,
    })
  );
}


export async function getActiveCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) throw error;

  return data || [];
}


export async function getCategoryById(id) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}


export async function createCategory(category) {
  const { data, error } = await supabase
    .from("categories")
    .insert([category])
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function updateCategory(
  id,
  category
) {
  const { data, error } = await supabase
    .from("categories")
    .update(category)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function deleteCategory(id) {
  const {
    count,
    error: countError,
  } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", id);

  if (countError) {
    throw countError;
  }

  if ((count || 0) > 0) {
    throw new Error(
      `Esta categoria possui ${count} produto(s).`
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}


export async function toggleCategoryStatus(
  id,
  active
) {
  const { data, error } = await supabase
    .from("categories")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function getCategoryProductCounts() {
  const { data, error } = await supabase
    .from("products")
    .select("category_id");

  if (error) throw error;

  const counts = {};

  (data || []).forEach((product) => {
    if (!product.category_id) return;

    counts[product.category_id] =
      (counts[product.category_id] || 0) + 1;
  });

  return counts;
}


// ============================================================
// MARCAS
// ============================================================

export async function getBrands() {
  const [
    brandsResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("*")
      .order("display_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("products")
      .select("id, brand_id"),
  ]);

  if (brandsResult.error) {
    console.error(
      "Erro ao carregar marcas:",
      brandsResult.error
    );

    throw brandsResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  const counts = {};

  (productsResult.data || []).forEach(
    (product) => {
      if (!product.brand_id) return;

      counts[product.brand_id] =
        (counts[product.brand_id] || 0) + 1;
    }
  );

  return (brandsResult.data || []).map(
    (brand) => ({
      ...brand,

      products_count:
        counts[brand.id] || 0,

      products:
        counts[brand.id] || 0,
    })
  );
}


export async function getActiveBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) throw error;

  return data || [];
}


export async function getBrandById(id) {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}


export async function createBrand(brand) {
  const { data, error } = await supabase
    .from("brands")
    .insert([brand])
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function updateBrand(
  id,
  brand
) {
  const { data, error } = await supabase
    .from("brands")
    .update(brand)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function deleteBrand(id) {
  const {
    count,
    error: countError,
  } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("brand_id", id);

  if (countError) {
    throw countError;
  }

  if ((count || 0) > 0) {
    throw new Error(
      `Esta marca possui ${count} produto(s).`
    );
  }

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}


export async function toggleBrandStatus(
  id,
  active
) {
  const { data, error } = await supabase
    .from("brands")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function getBrandProductCounts() {
  const { data, error } = await supabase
    .from("products")
    .select("brand_id");

  if (error) throw error;

  const counts = {};

  (data || []).forEach((product) => {
    if (!product.brand_id) return;

    counts[product.brand_id] =
      (counts[product.brand_id] || 0) + 1;
  });

  return counts;
}

// ============================================================
// CATÁLOGO RELACIONADO
// ============================================================
export async function getProductsByCategory(categoryId) {
  const { data, error } = await supabase.from("products").select("*").eq("category_id", categoryId).order("name");
  if (error) throw error;
  return data || [];
}

export async function getProductsByBrand(brandId) {
  const { data, error } = await supabase.from("products").select("*").eq("brand_id", brandId).order("name");
  if (error) throw error;
  return data || [];
}

// ============================================================
// SEÇÕES / VITRINES DO DELIVERY
// ============================================================
export async function getSections() {
  const { data, error } = await supabase.from("catalog_sections").select("*").order("display_order").order("name");
  if (error) throw error;
  return data || [];
}
export async function createSection(section) {
  const { data, error } = await supabase.from("catalog_sections").insert([section]).select().single();
  if (error) throw error; return data;
}
export async function updateSection(id, section) {
  const { data, error } = await supabase.from("catalog_sections").update(section).eq("id", id).select().single();
  if (error) throw error; return data;
}
export async function deleteSection(id) {
  const { error } = await supabase.from("catalog_sections").delete().eq("id", id);
  if (error) throw error; return true;
}
export async function getSectionProducts(sectionId) {
  const { data, error } = await supabase.from("catalog_section_products")
    .select("id, section_id, product_id, display_order, product:products(*)")
    .eq("section_id", sectionId).order("display_order");
  if (error) throw error; return data || [];
}
export async function addProductToSection(sectionId, productId) {
  const { data, error } = await supabase.from("catalog_section_products")
    .upsert([{ section_id: sectionId, product_id: productId }], { onConflict: "section_id,product_id", ignoreDuplicates: true })
    .select().maybeSingle();
  if (error) throw error; return data;
}
export async function removeProductFromSection(sectionId, productId) {
  const { error } = await supabase.from("catalog_section_products").delete().eq("section_id", sectionId).eq("product_id", productId);
  if (error) throw error; return true;
}
export async function reorderSectionProducts(sectionId, productIds) {
  const { error } = await supabase.rpc('admin_reorder_section', {section_ref:String(sectionId),product_refs:productIds.map(String)});
  if(error) throw error;
}
