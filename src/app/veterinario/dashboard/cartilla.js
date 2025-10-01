"use client";
import { useEffect, useState } from "react";
import { Container, Form, Button, Row, Col, Table, Modal, Alert, Spinner, Pagination } from "react-bootstrap";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Cartilla() {
  const [mascotas, setMascotas] = useState([]);
  const [filteredMascotas, setFilteredMascotas] = useState([]);
  const [filtro, setFiltro] = useState(""); 
  const [seleccionada, setSeleccionada] = useState(null);
  const [cartilla, setCartilla] = useState(null);
  const [errors, setErrors] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [formulario, setFormulario] = useState({ tipo: "", datos: {}, id: null });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("nombre");
  const [sortOrder, setSortOrder] = useState("asc");

  const etiquetaOptions = [
    { value: "", label: "Ninguna" },
    { value: "https://vetsapiensec.com/wp-content/uploads/2024/05/triple-felina-nuevo-lote.jpg", label: "Triple Felina" },
    { value: "https://patadeperroblogdeviajes.com/wp-content/uploads/2022/11/perros-como-leer-las-etiquetas-de-las-vacunas-pata-de-perro-blog-de-viajes5.webp", label: "Vacuna Perros" },
    { value: "https://svadcf.es/documentos/noticias/general/img_interior/16046.jpg", label: "Vacuna General" },
  ];

  useEffect(() => {
    setLoading(true);
    fetch("https://mascota-service.onrender.com/api/mascotas/mascotas")
      .then((res) => res.json())
      .then(async (mascotasData) => {
        const resClientes = await fetch("https://usuarios-service-emf5.onrender.com/api/usuarios/obtenerusuarios");
        const clientes = await resClientes.json();
        const mascotasConPropietarios = mascotasData.map((mascota) => {
          const cliente = clientes.find((c) => c.id === mascota.cliente_id);
          return {
            ...mascota,
            nombre_propietario: cliente ? cliente.nombre : "Sin propietario",
          };
        });
        setMascotas(mascotasConPropietarios);
        setFilteredMascotas(mascotasConPropietarios);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error al cargar datos:", err);
        setErrors({ general: "⚠️ Error al cargar mascotas." });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = [...mascotas];
    if (filtro) {
      filtered = filtered.filter((m) => m.nombre.toLowerCase().includes(filtro.toLowerCase()));
    }
    filtered.sort((a, b) => {
      const fieldA = a[sortField] || "";
      const fieldB = b[sortField] || "";
      return sortOrder === "asc"
        ? fieldA.toString().localeCompare(fieldB.toString())
        : fieldB.toString().localeCompare(fieldA.toString());
    });
    setFilteredMascotas(filtered);
    setCurrentPage(1);
  }, [mascotas, filtro, sortField, sortOrder]);

  const buscarCartilla = async (m) => {
    setSeleccionada(m);
    setCartilla(null);
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`https://cartillas-service.onrender.com/api/cartillas/cartilla/${m.id}`);
      if (res.status === 404) {
        setErrors({ general: "❌ Esta mascota no tiene una cartilla aún." });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCartilla(data);
      setLoading(false);
    } catch (err) {
      setErrors({ general: "⚠️ Error al obtener la cartilla." });
      setLoading(false);
    }
  };

  const crearCartilla = async () => {
    if (!seleccionada) return;
    setLoading(true);
    try {
      const res = await fetch("https://cartillas-service.onrender.com/api/cartillas/cartilla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mascota_id: seleccionada.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setErrors({ success: "✅ Cartilla creada correctamente." });
        setCartilla(data.cartilla);
      } else {
        setErrors({ general: data.message || "❌ Error al crear cartilla." });
      }
      setLoading(false);
    } catch (err) {
      setErrors({ general: "❌ Error al crear cartilla." });
      setLoading(false);
    }
  };

  const validateForm = (tipo, datos) => {
    const newErrors = {};
    if (tipo === "vacuna") {
      if (!datos.nombre) newErrors.nombre = "Nombre de la vacuna es obligatorio.";
      if (!datos.fecha_aplicacion) newErrors.fecha_aplicacion = "Fecha de aplicación es obligatoria.";
      if (!datos.firma_veterinario) newErrors.firma_veterinario = "Firma del veterinario es obligatoria.";
    } else {
      if (!datos.fecha_aplicacion) newErrors.fecha_aplicacion = "Fecha de aplicación es obligatoria.";
      if (!datos.peso_mascota) {
        newErrors.peso_mascota = "Peso de la mascota es obligatorio.";
      } else if (isNaN(datos.peso_mascota) || datos.peso_mascota <= 0) {
        newErrors.peso_mascota = "Peso debe ser un número positivo.";
      }
      if (!datos.nombre_producto) newErrors.nombre_producto = "Nombre del producto es obligatorio.";
      if (!datos.firma_veterinario) newErrors.firma_veterinario = "Firma del veterinario es obligatoria.";
    }
    return newErrors;
  };

  const abrirModalAgregar = (tipo) => {
    setFormulario({
      tipo,
      datos: {
        nombre: "",
        fecha_aplicacion: "",
        fecha_refuerzo: "",
        firma_veterinario: "",
        etiqueta_vacuna: "",
        peso_mascota: "",
        nombre_producto: "",
        proxima_aplicacion: "",
      },
      id: null,
    });
    setModalVisible(true);
    setErrors({});
  };

  const abrirModalEditar = (tipo, registro) => {
    setFormulario({
      tipo,
      datos: { ...registro },
      id: registro._id,
    });
    setModalEditarVisible(true);
    setErrors({});
  };

  const guardarRegistro = async () => {
    const newErrors = validateForm(formulario.tipo, formulario.datos);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const url = `https://cartillas-service.onrender.com/api/cartillas/cartilla/${formulario.tipo}`;
    const body = {
      mascota_id: seleccionada.id,
      ...formulario.datos,
      peso_mascota: formulario.datos.peso_mascota ? parseFloat(formulario.datos.peso_mascota) : undefined,
    };
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setModalVisible(false);
      await buscarCartilla(seleccionada);
      setErrors({ success: "✅ Registro guardado correctamente." });
      setLoading(false);
    } catch (err) {
      setErrors({ general: "❌ Error al guardar el registro." });
      setLoading(false);
    }
  };

  const actualizarRegistro = async () => {
    const newErrors = validateForm(formulario.tipo, formulario.datos);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const url = `https://cartillas-service.onrender.com/api/cartillas/cartilla/${formulario.tipo}/${formulario.id}`;
    const body = {
      mascota_id: seleccionada.id,
      ...formulario.datos,
      peso_mascota: formulario.datos.peso_mascota ? parseFloat(formulario.datos.peso_mascota) : undefined,
    };
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      setModalEditarVisible(false);
      await buscarCartilla(seleccionada);
      setErrors({ success: "✅ Registro actualizado correctamente." });
      setLoading(false);
    } catch (err) {
      setErrors({ general: "❌ Error al actualizar el registro." });
      setLoading(false);
    }
  };

  const eliminarRegistro = async (tipo, id) => {
    if (!window.confirm(`¿Estás seguro de eliminar este ${tipo}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`https://cartillas-service.onrender.com/api/cartillas/cartilla/${tipo}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mascota_id: seleccionada.id }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      await buscarCartilla(seleccionada);
      setErrors({ success: "✅ Registro eliminado correctamente." });
      setLoading(false);
    } catch (err) {
      setErrors({ general: "❌ Error al eliminar el registro." });
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMascotas = filteredMascotas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMascotas.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <Container className="text-dark mt-5 p-4 bg-light rounded shadow-lg" style={{
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1), 0 0 32px rgba(0, 128, 255, 0.1)",
        transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
        fontFamily: "Roboto, sans-serif",
      }} onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }} onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1), 0 0 32px rgba(0, 128, 255, 0.1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}>
        <h3 className="mb-4 fw-bold text-center text-primary">
          <i className="bi bi-clipboard-check-fill me-2"></i> Cartilla Sanitaria
        </h3>

        {errors.success && (
          <Alert variant="success" onClose={() => setErrors({})} dismissible className="shadow-sm">
            {errors.success}
          </Alert>
        )}
        {errors.general && (
          <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
            {errors.general}
          </Alert>
        )}

        <Row className="mb-4">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-bold"><i className="bi bi-search me-2"></i>Buscar mascota</Form.Label>
              <Form.Control
                type="text"
                className="bg-white text-dark border-secondary"
                placeholder="Buscar por nombre..."
                onChange={(e) => setFiltro(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex align-items-end">
            <Form.Group className="w-100">
              <Form.Label className="fw-bold">Ordenar por</Form.Label>
              <Form.Select
                className="bg-white text-dark border-secondary"
                value={sortField}
                onChange={(e) => handleSort(e.target.value)}
              >
                <option value="nombre">Nombre Mascota</option>
                <option value="nombre_propietario">Propietario</option>
              </Form.Select>
            </Form.Group>
            <Button
              variant="link"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="ms-2 text-dark"
            >
              <i className={`bi bi-arrow-${sortOrder === "asc" ? "up" : "down"}`}></i>
            </Button>
          </Col>
        </Row>

        {loading && (
          <div className="text-center mb-4">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Cargando...</p>
          </div>
        )}

        <div className="d-flex flex-wrap gap-2 mb-4">
          {currentMascotas.length === 0 && !loading ? (
            <p className="text-muted">No se encontraron mascotas.</p>
          ) : (
            currentMascotas.map((m) => (
              <Button
                key={m.id}
                variant={seleccionada?.id === m.id ? "info" : "secondary"}
                className="px-3 py-2"
                onClick={() => buscarCartilla(m)}
                style={{
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                  textTransform: "capitalize",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "none";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                {m.especie?.toLowerCase().includes("perro") ? (
                  <i className="bi bi-emoji-dog me-1"></i>
                ) : m.especie?.toLowerCase().includes("gato") ? (
                  <i className="bi bi-emoji-cat me-1"></i>
                ) : (
                  <i className="bi bi-paw me-1"></i>
                )}
                {m.nombre} {m.nombre_propietario && <small>({m.nombre_propietario})</small>}
              </Button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination className="justify-content-center mb-4">
            <Pagination.Prev
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item
                key={i + 1}
                active={i + 1 === currentPage}
                onClick={() => paginate(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        )}

        {errors.general?.includes("no tiene una cartilla") && seleccionada && (
          <div className="text-center mb-4">
            <Button
              variant="warning"
              onClick={crearCartilla}
              style={{
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                textTransform: "capitalize",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <i className="bi bi-plus-circle-fill me-2"></i> Crear cartilla para {seleccionada.nombre}
            </Button>
          </div>
        )}

        {cartilla && (
          <div className="p-4 bg-light border border-secondary rounded shadow-sm" style={{
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)",
            transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
          }} onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)";
            e.currentTarget.style.transform = "translateY(-4px)";
          }} onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
            <h5 className="text-center mb-4 fw-bold text-primary">
              <i className="bi bi-clipboard-check-fill me-2"></i> Cartilla de {seleccionada?.nombre}
              {seleccionada?.especie?.toLowerCase().includes("perro") ? (
                <i className="bi bi-emoji-dog ms-2"></i>
              ) : seleccionada?.especie?.toLowerCase().includes("gato") ? (
                <i className="bi bi-emoji-cat ms-2"></i>
              ) : (
                <i className="bi bi-paw ms-2"></i>
              )}
              {seleccionada?.nombre_propietario && (
                <span className="text-dark"> ({seleccionada?.nombre_propietario})</span>
              )}
            </h5>

            <Row>
              {/* Vacunas */}
              <Col md={6} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-primary">
                    <i className="bi bi-syringe me-2"></i> Vacunas
                  </h6>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => abrirModalAgregar("vacuna")}
                    style={{
                      borderRadius: "6px",
                      padding: "0.5rem 1rem",
                      fontSize: "0.9rem",
                      textTransform: "capitalize",
                      transition: "box-shadow 0.2s, transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                      e.target.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = "none";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    <i className="bi bi-plus-circle-fill me-1"></i> Agregar
                  </Button>
                </div>
                <div className="table-container" style={{
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}>
                  <Table
                    responsive
                    style={{ 
                      borderCollapse: "separate", 
                      borderSpacing: "0 8px", 
                      fontFamily: "Roboto, sans-serif" 
                    }}
                  >
                    <thead>
                      <tr>
                        <th onClick={() => handleSort("nombre")} style={{ 
                          cursor: "pointer",
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                          borderRadius: "8px 0 0 0"
                        }}>
                          <i className="bi bi-syringe me-2"></i> Nombre {sortField === "nombre" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th onClick={() => handleSort("fecha_aplicacion")} style={{ 
                          cursor: "pointer",
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-calendar-event me-2"></i> Aplicación {sortField === "fecha_aplicacion" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-calendar-check me-2"></i> Refuerzo
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-person-check me-2"></i> Firma
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-tag-fill me-2"></i> Etiqueta
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                          borderRadius: "0 8px 0 0" 
                        }}>
                          <i className="bi bi-gear-fill me-2"></i> Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartilla.vacunas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted">
                            Sin registros
                          </td>
                        </tr>
                      ) : (
                        cartilla.vacunas
                          .sort((a, b) => {
                            const fieldA = sortField === "fecha_aplicacion" ? new Date(a[sortField] || "") : a[sortField] || "";
                            const fieldB = sortField === "fecha_aplicacion" ? new Date(b[sortField] || "") : b[sortField] || "";
                            return sortOrder === "asc"
                              ? fieldA < fieldB ? -1 : 1
                              : fieldA > fieldB ? -1 : 1;
                          })
                          .map((v, i) => (
                            <tr
                              key={i}
                              style={{
                                cursor: "pointer",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)",
                                backgroundColor: "#ffffff",
                                transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out, background 0.3s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.backgroundColor = "#e9ecef";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)";
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.backgroundColor = "#ffffff";
                              }}
                            >
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{v.nombre || "-"}</td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                                {v.fecha_aplicacion
                                  ? format(new Date(v.fecha_aplicacion), "dd/MM/yyyy", { locale: es })
                                  : "-"}
                              </td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                                {v.fecha_refuerzo
                                  ? format(new Date(v.fecha_refuerzo), "dd/MM/yyyy", { locale: es })
                                  : "-"}
                              </td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{v.firma_veterinario || "-"}</td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                                {v.etiqueta_vacuna ? (
                                  <img
                                    src={v.etiqueta_vacuna}
                                    width="70"
                                    height="50"
                                    style={{ objectFit: "cover" }}
                                    alt="Etiqueta"
                                    onError={(e) => (e.target.src = "https://via.placeholder.com/70x50?text=Etiqueta")}
                                  />
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={{ padding: "0.8rem", border: "none", display: "flex", gap: "8px" }}>
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => abrirModalEditar("vacuna", v)}
                                  style={{
                                    borderRadius: "6px",
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.9rem",
                                    textTransform: "capitalize",
                                    transition: "box-shadow 0.2s, transform 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                                    e.target.style.transform = "translateY(-2px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.boxShadow = "none";
                                    e.target.style.transform = "translateY(0)";
                                  }}
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => eliminarRegistro("vacuna", v._id)}
                                  style={{
                                    borderRadius: "6px",
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.9rem",
                                    textTransform: "capitalize",
                                    transition: "box-shadow 0.2s, transform 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                                    e.target.style.transform = "translateY(-2px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.boxShadow = "none";
                                    e.target.style.transform = "translateY(0)";
                                  }}
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </Button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Col>

              {/* Desparasitación */}
              <Col md={6} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-primary">
                    <i className="bi bi-bug-fill me-2"></i> Antiparasitarios
                  </h6>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => abrirModalAgregar("antiparasitario")}
                    style={{
                      borderRadius: "6px",
                      padding: "0.5rem 1rem",
                      fontSize: "0.9rem",
                      textTransform: "capitalize",
                      transition: "box-shadow 0.2s, transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                      e.target.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = "none";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    <i className="bi bi-plus-circle-fill me-1"></i> Agregar
                  </Button>
                </div>
                <div className="table-container" style={{
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}>
                  <Table
                    responsive
                    style={{ 
                      borderCollapse: "separate", 
                      borderSpacing: "0 8px", 
                      fontFamily: "Roboto, sans-serif" 
                    }}
                  >
                    <thead>
                      <tr>
                        <th onClick={() => handleSort("fecha_aplicacion")} style={{ 
                          cursor: "pointer",
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                          borderRadius: "8px 0 0 0"
                        }}>
                          <i className="bi bi-calendar-event me-2"></i> Aplicación {sortField === "fecha_aplicacion" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-speedometer2 me-2"></i> Peso
                        </th>
                        <th onClick={() => handleSort("nombre_producto")} style={{ 
                          cursor: "pointer",
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-capsule me-2"></i> Producto {sortField === "nombre_producto" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-calendar-check me-2"></i> Próxima
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                        }}>
                          <i className="bi bi-person-check me-2"></i> Firma
                        </th>
                        <th style={{ 
                          padding: "1rem", 
                          background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                          border: "none", 
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                          borderRadius: "0 8px 0 0" 
                        }}>
                          <i className="bi bi-gear-fill me-2"></i> Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartilla.desparasitaciones.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted">
                            Sin registros
                          </td>
                        </tr>
                      ) : (
                        cartilla.desparasitaciones
                          .sort((a, b) => {
                            const fieldA = sortField === "fecha_aplicacion" ? new Date(a[sortField] || "") : a[sortField] || "";
                            const fieldB = sortField === "fecha_aplicacion" ? new Date(b[sortField] || "") : b[sortField] || "";
                            return sortOrder === "asc"
                              ? fieldA < fieldB ? -1 : 1
                              : fieldA > fieldB ? -1 : 1;
                          })
                          .map((d, i) => (
                            <tr
                              key={i}
                              style={{
                                cursor: "pointer",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)",
                                backgroundColor: "#ffffff",
                                transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out, background 0.3s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.backgroundColor = "#e9ecef";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)";
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.backgroundColor = "#ffffff";
                              }}
                            >
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                                {d.fecha_aplicacion
                                  ? format(new Date(d.fecha_aplicacion), "dd/MM/yyyy", { locale: es })
                                  : "-"}
                              </td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{d.peso_mascota ? `${d.peso_mascota} kg` : "-"}</td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{d.nombre_producto || "-"}</td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                                {d.proxima_aplicacion
                                  ? format(new Date(d.proxima_aplicacion), "dd/MM/yyyy", { locale: es })
                                  : "-"}
                              </td>
                              <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{d.firma_veterinario || "-"}</td>
                              <td style={{ padding: "0.8rem", border: "none", display: "flex", gap: "8px" }}>
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => abrirModalEditar("antiparasitario", d)}
                                  style={{
                                    borderRadius: "6px",
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.9rem",
                                    textTransform: "capitalize",
                                    transition: "box-shadow 0.2s, transform 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                                    e.target.style.transform = "translateY(-2px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.boxShadow = "none";
                                    e.target.style.transform = "translateY(0)";
                                  }}
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => eliminarRegistro("antiparasitario", d._id)}
                                  style={{
                                    borderRadius: "6px",
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.9rem",
                                    textTransform: "capitalize",
                                    transition: "box-shadow 0.2s, transform 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                                    e.target.style.transform = "translateY(-2px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.boxShadow = "none";
                                    e.target.style.transform = "translateY(0)";
                                  }}
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </Button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* Modal Agregar */}
        <Modal show={modalVisible} onHide={() => setModalVisible(false)} size="lg" centered className="fade" style={{
          borderRadius: "16px",
          boxShadow: "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)",
          transition: "transform 0.3s ease-in-out",
          fontFamily: "Roboto, sans-serif",
        }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
          <Modal.Header closeButton className="bg-light text-dark border-secondary">
            <Modal.Title>
              <i className="bi bi-plus-circle-fill me-2"></i> Agregar {formulario.tipo === "vacuna" ? "Vacuna" : "Antiparasitario"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light text-dark p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {Object.keys(errors).length > 0 && !errors.success && !errors.general && (
              <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
                <ul className="mb-0">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}
            <Form>
              {formulario.tipo === "vacuna" ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombre de la vacuna</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.nombre || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, nombre: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de aplicación</Form.Label>
                    <Form.Control
                      type="date"
                      value={formulario.datos.fecha_aplicacion || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, fecha_aplicacion: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de refuerzo</Form.Label>
                    <Form.Control
                      type="date"
                      value={formulario.datos.fecha_refuerzo || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, fecha_refuerzo: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Firma del veterinario</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.firma_veterinario || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, firma_veterinario: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Etiqueta de la vacuna</Form.Label>
                    <Form.Select
                      value={formulario.datos.etiqueta_vacuna || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, etiqueta_vacuna: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                    >
                      {etiquetaOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Form.Select>
                    {formulario.datos.etiqueta_vacuna && (
                      <div className="mt-2">
                        <img
                          src={formulario.datos.etiqueta_vacuna}
                          width="100"
                          height="70"
                          style={{ objectFit: "cover" }}
                          alt="Vista previa"
                          onError={(e) => (e.target.src = "https://via.placeholder.com/100x70?text=Sin+Imagen")}
                        />
                      </div>
                    )}
                  </Form.Group>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de aplicación</Form.Label>
                    <Form.Control
                      type="date"
                      value={formulario.datos.fecha_aplicacion || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, fecha_aplicacion: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Peso de la mascota (kg)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.1"
                      value={formulario.datos.peso_mascota || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, peso_mascota: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombre del producto</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.nombre_producto || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, nombre_producto: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Próxima aplicación</Form.Label>
                    <Form.Control
                      type="date"
                      value={formulario.datos.proxima_aplicacion || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, proxima_aplicacion: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Firma del veterinario</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.firma_veterinario || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, firma_veterinario: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                </>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer className="bg-light border-secondary">
            <Button
              variant="secondary"
              onClick={() => setModalVisible(false)}
              style={{
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                textTransform: "capitalize",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <i className="bi bi-x-circle-fill me-2"></i> Cancelar
            </Button>
            <Button
              variant="success"
              onClick={guardarRegistro}
              disabled={loading}
              style={{
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                textTransform: "capitalize",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-save-fill me-2"></i> Guardar
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Editar */}
        <Modal show={modalEditarVisible} onHide={() => setModalEditarVisible(false)} size="lg" centered className="fade" style={{
          borderRadius: "16px",
          boxShadow: "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)",
          transition: "transform 0.3s ease-in-out",
          fontFamily: "Roboto, sans-serif",
        }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
          <Modal.Header closeButton className="bg-light text-dark border-secondary">
            <Modal.Title>
              <i className="bi bi-pencil-fill me-2"></i> Editar {formulario.tipo === "vacuna" ? "Vacuna" : "Antiparasitario"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light text-dark p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {Object.keys(errors).length > 0 && !errors.success && !errors.general && (
              <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
                <ul className="mb-0">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}
            <Form>
              {formulario.tipo === "vacuna" ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombre de la vacuna</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.nombre || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, nombre: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de aplicación</Form.Label>
                    <Form.Control
                      type="date"
                      value={
                        formulario.datos.fecha_aplicacion
                          ? new Date(formulario.datos.fecha_aplicacion).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, fecha_aplicacion: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de refuerzo</Form.Label>
                    <Form.Control
                      type="date"
                      value={
                        formulario.datos.fecha_refuerzo
                          ? new Date(formulario.datos.fecha_refuerzo).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, fecha_refuerzo: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Firma del veterinario</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.firma_veterinario || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, firma_veterinario: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Etiqueta de la vacuna</Form.Label>
                    <Form.Select
                      value={formulario.datos.etiqueta_vacuna || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, etiqueta_vacuna: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                    >
                      {etiquetaOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Form.Select>
                    {formulario.datos.etiqueta_vacuna && (
                      <div className="mt-2">
                        <img
                          src={formulario.datos.etiqueta_vacuna}
                          width="100"
                          height="70"
                          style={{ objectFit: "cover" }}
                          alt="Vista previa"
                          onError={(e) => (e.target.src = "https://via.placeholder.com/100x70?text=Sin+Imagen")}
                        />
                      </div>
                    )}
                  </Form.Group>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Fecha de aplicación</Form.Label>
                    <Form.Control
                      type="date"
                      value={
                        formulario.datos.fecha_aplicacion
                          ? new Date(formulario.datos.fecha_aplicacion).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, fecha_aplicacion: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Peso de la mascota (kg)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.1"
                      value={formulario.datos.peso_mascota || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, peso_mascota: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombre del producto</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.nombre_producto || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, nombre_producto: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Próxima aplicación</Form.Label>
                    <Form.Control
                      type="date"
                      value={
                        formulario.datos.proxima_aplicacion
                          ? new Date(formulario.datos.proxima_aplicacion).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, proxima_aplicacion: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Firma del veterinario</Form.Label>
                    <Form.Control
                      type="text"
                      value={formulario.datos.firma_veterinario || ""}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          datos: { ...formulario.datos, firma_veterinario: e.target.value },
                        })
                      }
                      className="bg-white text-dark border-secondary"
                      required
                    />
                  </Form.Group>
                </>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer className="bg-light border-secondary">
            <Button
              variant="secondary"
              onClick={() => setModalEditarVisible(false)}
              style={{
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                textTransform: "capitalize",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <i className="bi bi-x-circle-fill me-2"></i> Cancelar
            </Button>
            <Button
              variant="warning"
              onClick={actualizarRegistro}
              disabled={loading}
              style={{
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                textTransform: "capitalize",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.2)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Actualizando...
                </>
              ) : (
                <>
                  <i className="bi bi-pencil-fill me-2"></i> Actualizar
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}