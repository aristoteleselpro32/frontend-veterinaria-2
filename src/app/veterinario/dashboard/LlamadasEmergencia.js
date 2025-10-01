"use client";
import { useState, useEffect } from "react";
import { Container, Table, Spinner, Alert, Form, Row, Col, Button, Modal } from "react-bootstrap";

export default function LlamadasEmergencia({ veterinarioId }) {
  const [llamadas, setLlamadas] = useState([]);
  const [filteredLlamadas, setFilteredLlamadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [llamadaSeleccionada, setLlamadaSeleccionada] = useState(null);
  const [pagoLoading, setPagoLoading] = useState(false);

  useEffect(() => {
    const fetchLlamadas = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/llamadas/emergencias/veterinario/${veterinarioId}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("Error al obtener las llamadas de emergencia");
        }
        const data = await response.json();
        setLlamadas(data);
        setFilteredLlamadas(data);
      } catch (err) {
        console.error("Error fetching llamadas:", err);
        setError("❌ Error al cargar las llamadas de emergencia");
      } finally {
        setLoading(false);
      }
    };

    if (veterinarioId) {
      fetchLlamadas();
    }
  }, [veterinarioId]);

  useEffect(() => {
    let filtered = llamadas;
    if (filtroCliente) {
      filtered = filtered.filter((ll) => ll.cliente_nombre.toLowerCase().includes(filtroCliente.toLowerCase()));
    }
    if (filtroMotivo) {
      filtered = filtered.filter((ll) => ll.motivo.toLowerCase().includes(filtroMotivo.toLowerCase()));
    }
    if (filtroEstado) {
      filtered = filtered.filter((ll) => ll.estado === filtroEstado);
    }
    if (filtroDesde) {
      filtered = filtered.filter((ll) => new Date(ll.created_at) >= new Date(filtroDesde));
    }
    if (filtroHasta) {
      filtered = filtered.filter((ll) => new Date(ll.created_at) <= new Date(filtroHasta));
    }
    setFilteredLlamadas(filtered);
  }, [filtroCliente, filtroMotivo, filtroEstado, filtroDesde, filtroHasta, llamadas]);

  const handlePagar = async () => {
    if (!llamadaSeleccionada) return;
    setPagoLoading(true);
    try {
      const response = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/llamadas/${llamadaSeleccionada.id}/pagar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Error al marcar como pagada");
      }
      // Actualizar la lista
      const updatedLlamadas = llamadas.map((ll) => 
        ll.id === llamadaSeleccionada.id ? { ...ll, pagado: true } : ll
      );
      setLlamadas(updatedLlamadas);
      setFilteredLlamadas(updatedLlamadas);
      setShowPagoModal(false);
    } catch (err) {
      setError("❌ Error al procesar el pago");
    } finally {
      setPagoLoading(false);
    }
  };

  return (
    <Container
      style={{
        background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1), 0 0 32px rgba(0, 128, 255, 0.1)",
        minHeight: "100vh",
        transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
        fontFamily: "Roboto, sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1), 0 0 32px rgba(0, 128, 255, 0.1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <h2
        style={{
          fontSize: "1.8rem",
          fontWeight: 600,
          color: "#000000",
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          fontFamily: "Roboto, sans-serif",
        }}
      >
        <i className="bi bi-telephone me-2"></i>Llamadas de Emergencia
      </h2>

      {error && (
        <Alert
          variant="danger"
          onClose={() => setError("")}
          dismissible
          style={{ borderRadius: "6px", fontSize: "0.9rem", fontFamily: "Roboto, sans-serif" }}
        >
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filtrar por Cliente</Form.Label>
            <Form.Control
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Filtrar por Motivo</Form.Label>
            <Form.Control
              type="text"
              value={filtroMotivo}
              onChange={(e) => setFiltroMotivo(e.target.value)}
              placeholder="Motivo"
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Desde</Form.Label>
            <Form.Control
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Hasta</Form.Label>
            <Form.Control
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Estado</Form.Label>
            <Form.Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="finalizada">Finalizada</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <Spinner animation="border" variant="primary" />
          <p style={{ marginTop: "0.5rem", color: "#212529", fontFamily: "Roboto, sans-serif" }}>
            Cargando datos...
          </p>
        </div>
      ) : (
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
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  borderRadius: "8px 0 0 0"
                }}><i className="bi bi-person me-2"></i>Cliente</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-person me-2"></i>Veterinario</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-clock me-2"></i>Duración</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-calendar me-2"></i>Fecha</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-check-circle me-2"></i>Aceptada</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-x-circle me-2"></i>Finalizada</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-telephone me-2"></i>Teléfono</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-info-circle me-2"></i>Motivo</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-currency-dollar me-2"></i>Precio</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)" 
                }}><i className="bi bi-info-circle me-2"></i>Estado</th>
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  borderRadius: "0 8px 0 0" 
                }}><i className="bi bi-currency-dollar me-2"></i>Pagado</th>
              </tr>
            </thead>
            <tbody>
              {filteredLlamadas.map((llamada) => (
                <tr
                  key={llamada.id}
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
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{llamada.cliente_nombre || "N/D"}</td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{llamada.veterinario_nombre || "N/D"}</td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{llamada.duracion_formato || "N/D"}</td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                    {new Date(llamada.created_at).toLocaleString() || "N/D"}
                  </td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                    {llamada.accepted_at ? new Date(llamada.accepted_at).toLocaleString() : "N/D"}
                  </td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                    {llamada.ended_at ? new Date(llamada.ended_at).toLocaleString() : "N/D"}
                  </td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{llamada.cliente_telefono || "N/D"}</td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{llamada.motivo || "N/D"}</td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                    {llamada.precio ? `$${llamada.precio.toFixed(2)}` : "N/D"}
                  </td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>{llamada.estado || "pendiente"}</td>
                  <td style={{ padding: "0.8rem", color: "#212529", border: "none" }}>
                    {llamada.pagado ? (
                      <span style={{ color: "green" }}>Pagado</span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setLlamadaSeleccionada(llamada);
                          setShowPagoModal(true);
                        }}
                        style={{
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
                        Pagar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLlamadas.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center text-muted">
                    No se encontraron llamadas de emergencia
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal de Pago */}
      <Modal show={showPagoModal} onHide={() => setShowPagoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {llamadaSeleccionada && (
            <>
              <p><strong>Cliente:</strong> {llamadaSeleccionada.cliente_nombre}</p>
              <p><strong>Motivo:</strong> {llamadaSeleccionada.motivo}</p>
              <p><strong>Precio:</strong> ${llamadaSeleccionada.precio?.toFixed(2) || "N/D"}</p>
              <p>¿Confirmar que esta llamada ha sido pagada?</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPagoModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handlePagar} disabled={pagoLoading}>
            {pagoLoading ? <Spinner animation="border" size="sm" /> : "Confirmar Pago"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}