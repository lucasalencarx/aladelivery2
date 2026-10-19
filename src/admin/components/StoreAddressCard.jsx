import { useEffect, useState } from "react";
import {
  MapPin,
  Pencil,
  X,
  Save,
} from "lucide-react";

import { supabase } from "../../supabase/supabase"; // importar a conexao e dados db //

export default function StoreAddressCard() {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
  });

  useEffect(() => {
    loadAddress();
  }, []);

  async function loadAddress() {
    setLoading(true);

    const { data, error } = await supabase
      .from("store_info")
      .select(`
        id,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zip_code
      `)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "Erro ao carregar endereço da loja:",
        error
      );

      setMessage(
        "Não foi possível carregar o endereço."
      );

      setLoading(false);

      return;
    }

    if (!data) {
      setMessage(
        "Nenhum endereço cadastrado."
      );

      setLoading(false);

      return;
    }

    setAddress(data);

    setForm({
      street: data.street || "",
      number: data.number || "",
      complement: data.complement || "",
      neighborhood: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
      zip_code: data.zip_code || "",
    });

    setLoading(false);
  }

  function handleOpenEdit() {
    if (!address) return;

    setForm({
      street: address.street || "",
      number: address.number || "",
      complement: address.complement || "",
      neighborhood: address.neighborhood || "",
      city: address.city || "",
      state: address.state || "",
      zip_code: address.zip_code || "",
    });

    setMessage("");

    setShowEdit(true);
  }

  function handleCloseEdit() {
    setShowEdit(false);

    setMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,

      [name]:
        name === "state"
          ? value.toUpperCase()
          : value,
    }));
  }

  async function updateAddress(event) {
    event.preventDefault();

    if (!form.street.trim()) {
      setMessage("Informe a rua.");

      return;
    }

    if (!form.number.trim()) {
      setMessage("Informe o número.");

      return;
    }

    if (!form.neighborhood.trim()) {
      setMessage("Informe o bairro.");

      return;
    }

    if (!form.city.trim()) {
      setMessage("Informe a cidade.");

      return;
    }

    if (!form.state.trim()) {
      setMessage("Informe o estado.");

      return;
    }

    setSaving(true);

    setMessage("");

    const payload = {
      street: form.street.trim(),
      number: form.number.trim(),
      complement:
        form.complement.trim() || null,
      neighborhood:
        form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state
        .trim()
        .toUpperCase(),
      zip_code: form.zip_code.trim(),
      updated_at:
        new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("store_info")
      .update(payload)
      .eq("id", 1)
      .select(`
        id,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zip_code
      `)
      .single();

    if (error) {
      console.error(
        "Erro ao atualizar endereço:",
        error
      );

      setMessage(
        "Erro ao salvar o endereço."
      );

      setSaving(false);

      return;
    }

    setAddress(data);

    setMessage(
      "Endereço atualizado com sucesso."
    );

    setSaving(false);

    setTimeout(() => {
      setShowEdit(false);

      setMessage("");
    }, 800);
  }

  return (
    <>
      <article className="dashboardCard addressCard">
        <strong className="dashboardCardTitle">
          <MapPin size={14} />

          Endereço da Loja
        </strong>

        <div className="addressText">
          {loading ? (
            <span>
              Carregando endereço...
            </span>
          ) : address ? (
            <>
              <span>
                {address.street},{" "}
                {address.number}
              </span>

              {address.complement && (
                <span>
                  {address.complement}
                </span>
              )}

              <span>
                {address.neighborhood},{" "}
                {address.city} -{" "}
                {address.state}
              </span>

              <span>
                CEP:{" "}
                {address.zip_code ||
                  "Não informado"}
              </span>
            </>
          ) : (
            <span>
              Endereço não cadastrado.
            </span>
          )}
        </div>

        <button
          type="button"
          className="softAction"
          onClick={handleOpenEdit}
          disabled={loading || !address}
        >
          Atualizar Endereço

          <Pencil size={12} />
        </button>
      </article>

      {showEdit && (
        <div
          className="addressModalOverlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseEdit();
            }
          }}
        >
          <div className="addressModal">
            <div className="addressModalHeader">
              <div>
                <span className="addressModalIcon">
                  <MapPin size={18} />
                </span>

                <div>
                  <h2>
                    Atualizar endereço
                  </h2>

                  <p>
                    Edite os dados da
                    localização da loja.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="addressModalClose"
                onClick={
                  handleCloseEdit
                }
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={updateAddress}
            >
              <div className="addressForm">
                <div className="addressField addressFieldFull">
                  <label htmlFor="street">
                    Rua
                  </label>

                  <input
                    id="street"
                    name="street"
                    type="text"
                    value={form.street}
                    onChange={
                      handleChange
                    }
                    placeholder="Ex: Rua Tiradentes"
                  />
                </div>

                <div className="addressField">
                  <label htmlFor="number">
                    Número
                  </label>

                  <input
                    id="number"
                    name="number"
                    type="text"
                    value={form.number}
                    onChange={
                      handleChange
                    }
                    placeholder="1080"
                  />
                </div>

                <div className="addressField">
                  <label htmlFor="complement">
                    Complemento
                  </label>

                  <input
                    id="complement"
                    name="complement"
                    type="text"
                    value={
                      form.complement
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Sala, bloco..."
                  />
                </div>

                <div className="addressField">
                  <label htmlFor="neighborhood">
                    Bairro
                  </label>

                  <input
                    id="neighborhood"
                    name="neighborhood"
                    type="text"
                    value={
                      form.neighborhood
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Centro"
                  />
                </div>

                <div className="addressField">
                  <label htmlFor="city">
                    Cidade
                  </label>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={
                      handleChange
                    }
                    placeholder="Corumbá"
                  />
                </div>

                <div className="addressField addressFieldState">
                  <label htmlFor="state">
                    UF
                  </label>

                  <input
                    id="state"
                    name="state"
                    type="text"
                    maxLength={2}
                    value={form.state}
                    onChange={
                      handleChange
                    }
                    placeholder="MS"
                  />
                </div>

                <div className="addressField">
                  <label htmlFor="zip_code">
                    CEP
                  </label>

                  <input
                    id="zip_code"
                    name="zip_code"
                    type="text"
                    value={
                      form.zip_code
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="79300-000"
                  />
                </div>
              </div>

              {message && (
                <div className="addressMessage">
                  {message}
                </div>
              )}

              <div className="addressModalActions">
                <button
                  type="button"
                  className="addressCancelButton"
                  onClick={
                    handleCloseEdit
                  }
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="addressSaveButton"
                  disabled={saving}
                >
                  <Save size={15} />

                  {saving
                    ? "Salvando..."
                    : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}