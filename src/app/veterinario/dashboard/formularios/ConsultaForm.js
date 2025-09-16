"use client";
import { useState, useEffect } from "react";
import { Form, Button, Row, Col, Modal, Alert } from "react-bootstrap";
import { parse, isValid, differenceInMinutes, format } from "date-fns";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ConsultaForm({ mascota, propietario, data = {}, editar = false, onSave, onComplete, onClose }) {
  const veterinario = JSON.parse(localStorage.getItem("user") || "{}");

  const [formData, setFormData] = useState({
    mascota_id: mascota._id || mascota.id,
    veterinario_id: veterinario?.id || "",
    fecha: data.fecha ? format(new Date(data.fecha), "yyyy-MM-dd") : new Date().toISOString().slice(0, 10),
    motivo: data.motivo || "",
    objetivo: data.objetivo || "",
    subjetivo: data.subjetivo || "",
    interpretacion: data.interpretacion || "",
    plan_terapeutico: data.plan_terapeutico || "",
    proximo_control_fecha: data.proximo_control ? format(new Date(data.proximo_control), "yyyy-MM-dd") : "",
    proximo_control_hora: data.proximo_control ? format(new Date(data.proximo_control), "HH:mm") : "",
    examen_fisico: {
      temperatura: data.examen_fisico?.temperatura || "",
      unidad_temperatura: data.examen_fisico?.unidad_temperatura || "°C",
      peso: data.examen_fisico?.peso || "",
      unidad_peso: data.examen_fisico?.unidad_peso || "kg",
      frecuencia_cardiaca: data.examen_fisico?.frecuencia_cardiaca || "",
      frecuencia_respiratoria: data.examen_fisico?.frecuencia_respiratoria || "",
      presion_arterial: data.examen_fisico?.presion_arterial || "",
      reflejos: data.examen_fisico?.reflejos || "",
      pulso: data.examen_fisico?.pulso || "",
      mucosas: data.examen_fisico?.mucosas || "",
      palpitacion: data.examen_fisico?.palpitacion || "",
      dentadura: data.examen_fisico?.dentadura || "",
      encias: data.examen_fisico?.encias || "",
      sarro: data.examen_fisico?.sarro || "",
      ojos: data.examen_fisico?.ojos || "",
      orejas: data.examen_fisico?.orejas || "",
      piel_y_pelo: data.examen_fisico?.piel_y_pelo || "",
      observaciones: data.examen_fisico?.observaciones || "",
    },
    precio: data.precio || 50,
    estado: data.estado || "pendiente",
  });

  const [mostrarExamenFisico, setMostrarExamenFisico] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [errors, setErrors] = useState({});
  const [reservas, setReservas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        if (!veterinario?.id) throw new Error("ID del veterinario no definido.");
        const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/veterinario/${veterinario.id}`);
        if (!res.ok) throw new Error("Error al cargar reservas");
        const data = await res.json();
        setReservas(data.map((r) => ({ ...r, fecha: new Date(r.fecha) })));
      } catch (err) {
        setErrors({ general: "❌ Error cargando reservas: " + err.message });
      }
    };
    if (veterinario?.id) cargarReservas();
  }, [veterinario?.id]);

  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios");
        if (!res.ok) throw new Error("Error al cargar servicios");
        setServicios(await res.json());
      } catch (err) {
        setErrors({ general: "❌ Error cargando servicios: " + err.message });
      }
    };
    cargarServicios();
  }, []);

  const validateNumber = (value, fieldName) => {
    if (value === "") return true;
    if (fieldName === "presion_arterial") {
      return /^\d{1,3}\/\d{1,3}$/.test(value) ? true : "Debe ser un valor como '120/80'.";
    }
    if (fieldName === "frecuencia_cardiaca" || fieldName === "frecuencia_respiratoria") {
      return /^\d+(\s*(lpm|rpm))?$/.test(value) ? true : `Debe ser un número válido (ej. '120 lpm' o '30 rpm').`;
    }
    return /^\d*\.?\d*$/.test(value) && !isNaN(parseFloat(value)) ? true : "Debe ser un número válido.";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    if (["temperatura", "peso", "frecuencia_cardiaca", "frecuencia_respiratoria", "presion_arterial"].includes(name)) {
      const validationResult = validateNumber(value, name);
      newErrors[name] = validationResult === true ? undefined : validationResult;
    } else if (name === "precio" && value < 0) {
      newErrors.precio = "El precio no puede ser negativo.";
    } else {
      delete newErrors[name];
    }

    if (name in formData.examen_fisico) {
      setFormData((prev) => ({
        ...prev,
        examen_fisico: { ...prev.examen_fisico, [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors(newErrors);
  };

  const validarCita = () => {
    const { proximo_control_fecha, proximo_control_hora } = formData;
    if (!proximo_control_fecha || !proximo_control_hora) {
      return { isValid: false, error: "⚠️ Debes ingresar la fecha y hora del próximo control." };
    }

    const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(proximo_control_hora)) {
      return { isValid: false, error: "⚠️ La hora ingresada no es válida (formato HH:mm)." };
    }

    const fechaHora = parse(`${proximo_control_fecha} ${proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date());
    if (!isValid(fechaHora)) {
      return { isValid: false, error: "⚠️ Fecha u hora inválida." };
    }

    const hora = fechaHora.getHours();
    if (hora < 7 || hora >= 21) {
      return { isValid: false, error: "⚠️ Solo se pueden agendar citas entre las 07:00 y las 21:00." };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaHora < hoy) {
      return { isValid: false, error: "⚠️ No puedes agendar citas en fechas pasadas." };
    }

    const conflicto = reservas.some((r) => Math.abs(differenceInMinutes(fechaHora, new Date(r.fecha))) < 60);
    if (conflicto) {
      return { isValid: false, error: "⚠️ Ya hay una cita dentro del rango de 1 hora." };
    }

    const servicioConsulta = servicios.find((s) => s.nombre.trim().toLowerCase().includes("consulta"));
    if (!servicioConsulta) {
      return { isValid: false, error: "❌ No se encontró el servicio de Consulta." };
    }

    return { isValid: true, fechaHora, servicioConsulta };
  };

  const agendarCita = async () => {
    setErrors({});
    const validacion = validarCita();
    if (!validacion.isValid) {
      setErrors({ general: validacion.error });
      return;
    }

    const { fechaHora, servicioConsulta } = validacion;
    if (!veterinario?.id) {
      setErrors({ general: "❌ No se encontró información del veterinario." });
      return;
    }

    const cita = {
      cliente_id: propietario.id,
      mascota_id: mascota._id || mascota.id,
      veterinario_id: veterinario.id,
      servicio_id: servicioConsulta.id,
      fecha: format(fechaHora, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cita),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al agendar cita");
      setErrors({ success: "✅ Cita agendada con éxito." });
      setMostrarModalConfirmacion(false);
      if (editar) onClose();
      else onComplete();
    } catch (err) {
      setErrors({ general: "❌ Error al agendar cita: " + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const newErrors = {};
    const numericFields = [
      { key: "temperatura", label: "Temperatura" },
      { key: "peso", label: "Peso" },
      { key: "frecuencia_cardiaca", label: "Frecuencia Cardíaca" },
      { key: "frecuencia_respiratoria", label: "Frecuencia Respiratoria" },
      { key: "presion_arterial", label: "Presión Arterial" },
    ];

    numericFields.forEach(({ key, label }) => {
      const value = formData.examen_fisico[key];
      const validationResult = validateNumber(value, key);
      if (validationResult !== true) newErrors[key] = `${label}: ${validationResult}`;
    });

    if (!formData.motivo) newErrors.motivo = "Motivo es obligatorio.";
    if (!formData.fecha) newErrors.fecha = "Fecha es obligatoria.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    if (!veterinario?.id) {
      setErrors({ general: "❌ No se encontró información del veterinario." });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      veterinario_id: veterinario.id,
      examen_fisico: {
        ...formData.examen_fisico,
        temperatura: formData.examen_fisico.temperatura ? parseFloat(formData.examen_fisico.temperatura) : undefined,
        peso: formData.examen_fisico.peso ? parseFloat(formData.examen_fisico.peso) : undefined,
      },
      proximo_control: formData.proximo_control_fecha && formData.proximo_control_hora
        ? parse(`${formData.proximo_control_fecha} ${formData.proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date())
        : undefined,
      proximo_control_fecha: undefined,
      proximo_control_hora: undefined,
    };

    try {
      if (editar) {
        if (!data._id) throw new Error("ID de la consulta no definido.");
        const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/consultas/${data._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar la consulta");
        setErrors({ success: "✅ Consulta actualizada con éxito." });
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          setMostrarModalConfirmacion(true);
        } else {
          onClose();
        }
      } else {
        await onSave(payload);
        setErrors({ success: "✅ Consulta creada con éxito." });
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          setMostrarModalConfirmacion(true);
        } else {
          onComplete();
        }
      }
    } catch (err) {
      setErrors({ general: `❌ Error al guardar la consulta: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const marcarComoPagado = async () => {
    if (!data._id) {
      setErrors({ general: "ID de la consulta no definido." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/consultas/${data._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "pagado" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar el estado de pago");
      setFormData((prev) => ({ ...prev, estado: "pagado" }));
      setErrors({ success: "✅ Consulta marcada como pagada con éxito." });
    } catch (err) {
      setErrors({ general: `❌ Error al marcar como pagada: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrar = () => {
    if (formData.proximo_control_fecha && formData.proximo_control_hora) {
      setMostrarModalConfirmacion(true);
    } else {
      if (editar) onClose();
      else onComplete();
    }
  };

  const buttonStyle = {
    borderRadius: "8px",
    padding: "0.6rem 1.2rem",
    fontSize: "1rem",
    textTransform: "capitalize",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };

  const buttonHover = {
    onMouseEnter: (e) => (e.target.style.transform = "translateY(-2px)"),
    onMouseLeave: (e) => (e.target.style.transform = "translateY(0)"),
  };

  const motivosOptions = [
    "Consulta general",
    "Revisión/Chequeo",
    "Acupuntura",
    "Alergología",
    "Anestesiología",
    "Cardiología",
    "Dermatología",
    "Urgencias",
    "Endocrinología",
    "Etología",
    "Gastroenterología",
    "Hospitalización",
    "Cuidados críticos o intensivos",
    "Cirugía laser",
    "Nefrología",
    "Neurología",
    "Nutrición",
    "Reproducción u obstetricia",
    "Odontología",
    "Oncología",
    "Oftalmología",
    "Ortopedia",
    "Fisioterapia",
    "Neumología",
    "Consulta preanestésica",
    "Consulta prequirúrgica",
    "Psicología",
    "Cirugía tejidos blandos",
    "Esterilización",
    "Medicina felina",
    "Vacunación",
    "Desparasitación",
    "Cirugía",
    "Examen de laboratorio",
    "Laboratorio clínico",
    "Resonancia magnética",
    "Tomografía",
    "Ecografía",
    "Radiografía (Rayos X)",
    "Peluquería o Spa",
    "Otro",
  ];

  return (
    <>
      <style jsx>{`
        .form-control, .form-select {
          background-color: #f8f9fa !important;
          color: #212529 !important;
          border-color: #ced4da !important;
        }
        .form-label {
          color: #212529 !important;
          font-weight: 600 !important;
        }
        .modal-content {
          background-color: #ffffff !important;
          color: #212529 !important;
        }
        .btn-close {
          color: #ffffffff !important;
          background-color: #ffffff !important;
          border: 1px solid #ced4da !important;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }
        .close-btn:hover {
          background-color: #e9ecef !important;
        }
      `}</style>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
      <Form onSubmit={handleSubmit}>
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
        {Object.keys(errors).length > 0 && !errors.success && !errors.general && (
          <Alert variant="danger" onClose={() => setErrors({})} dismissible className="shadow-sm">
            <ul className="mb-0">
              {Object.values(errors).filter(Boolean).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-calendar-event me-2"></i>Fecha</Form.Label>
              <Form.Control
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-clipboard-check me-2"></i>Motivo</Form.Label>
              <Form.Select
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona un motivo</option>
                {motivosOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-list-check me-2"></i>Objetivo</Form.Label>
              <Form.Control
                name="objetivo"
                placeholder="Detalles del examen, lista de problemas"
                value={formData.objetivo}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-file-medical me-2"></i>Subjetivo</Form.Label>
              <Form.Control
                name="subjetivo"
                placeholder="Motivo de consulta"
                value={formData.subjetivo}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-clipboard-pulse me-2"></i>Interpretación</Form.Label>
              <Form.Control
                name="interpretacion"
                placeholder="Diagnóstico presuntivo y final"
                value={formData.interpretacion}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-prescription me-2"></i>Plan Terapéutico</Form.Label>
              <Form.Control
                name="plan_terapeutico"
                placeholder="Tratamiento y demás"
                value={formData.plan_terapeutico}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-currency-dollar me-2"></i>Precio</Form.Label>
              <Form.Control
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-wallet me-2"></i>Estado de Pago</Form.Label>
              <Form.Control
                value={formData.estado === "pendiente" ? "Por Pagar" : "Pagado"}
                readOnly
              />
              {editar && formData.estado === "pendiente" && (
                <Button
                  variant="success"
                  className="mt-2"
                  onClick={marcarComoPagado}
                  disabled={isSubmitting}
                  style={buttonStyle}
                  {...buttonHover}
                >
                  <i className="bi bi-check-circle-fill me-2"></i>Marcar como Pagado
                </Button>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <h6><i className="bi bi-calendar-fill me-2"></i>Próximo Control</h6>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    name="proximo_control_fecha"
                    value={formData.proximo_control_fecha}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Hora</Form.Label>
                  <Form.Control
                    type="time"
                    name="proximo_control_hora"
                    value={formData.proximo_control_hora}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setMostrarExamenFisico(!mostrarExamenFisico)}
              className="mb-3"
              style={buttonStyle}
              {...buttonHover}
            >
              <i className="bi bi-heart-pulse-fill me-2"></i>
              {mostrarExamenFisico ? "Ocultar Examen Físico" : "Mostrar Examen Físico"}
            </Button>
            {mostrarExamenFisico && (
              <>
                <h6><i className="bi bi-heart-pulse-fill me-2"></i>Examen Físico</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Temperatura</Form.Label>
                      <Form.Control
                        list="temperatura-suggestions"
                        type="number"
                        step="0.1"
                        name="temperatura"
                        value={formData.examen_fisico.temperatura}
                        onChange={handleChange}
                        placeholder="Ej. 38.5"
                      />
                      <datalist id="temperatura-suggestions">
                        <option value="38.5" />
                        <option value="39.0" />
                        <option value="37.5" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Unidad de Temperatura</Form.Label>
                      <Form.Select
                        name="unidad_temperatura"
                        value={formData.examen_fisico.unidad_temperatura}
                        onChange={handleChange}
                      >
                        <option value="°C">°C</option>
                        <option value="°F">°F</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Peso</Form.Label>
                      <Form.Control
                        list="peso-suggestions"
                        type="number"
                        step="0.1"
                        name="peso"
                        value={formData.examen_fisico.peso}
                        onChange={handleChange}
                        placeholder="Ej. 5.2"
                      />
                      <datalist id="peso-suggestions">
                        <option value="5.2" />
                        <option value="10.0" />
                        <option value="2.5" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Unidad de Peso</Form.Label>
                      <Form.Select
                        name="unidad_peso"
                        value={formData.examen_fisico.unidad_peso}
                        onChange={handleChange}
                      >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Frecuencia Cardíaca</Form.Label>
                      <Form.Control
                        list="frecuencia_cardiaca-suggestions"
                        name="frecuencia_cardiaca"
                        value={formData.examen_fisico.frecuencia_cardiaca}
                        onChange={handleChange}
                        placeholder="Ej. 120 lpm"
                      />
                      <datalist id="frecuencia_cardiaca-suggestions">
                        <option value="120 lpm" />
                        <option value="100 lpm" />
                        <option value="80 lpm" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Frecuencia Respiratoria</Form.Label>
                      <Form.Control
                        list="frecuencia_respiratoria-suggestions"
                        name="frecuencia_respiratoria"
                        value={formData.examen_fisico.frecuencia_respiratoria}
                        onChange={handleChange}
                        placeholder="Ej. 30 rpm"
                      />
                      <datalist id="frecuencia_respiratoria-suggestions">
                        <option value="30 rpm" />
                        <option value="20 rpm" />
                        <option value="40 rpm" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Presión Arterial</Form.Label>
                      <Form.Control
                        list="presion_arterial-suggestions"
                        name="presion_arterial"
                        value={formData.examen_fisico.presion_arterial}
                        onChange={handleChange}
                        placeholder="Ej. 120/80"
                      />
                      <datalist id="presion_arterial-suggestions">
                        <option value="120/80" />
                        <option value="130/85" />
                        <option value="110/70" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Reflejos</Form.Label>
                      <Form.Control
                        list="reflejos-suggestions"
                        name="reflejos"
                        value={formData.examen_fisico.reflejos}
                        onChange={handleChange}
                        placeholder="Ej. Normales"
                      />
                      <datalist id="reflejos-suggestions">
                        <option value="Normales" />
                        <option value="Disminuidos" />
                        <option value="Aumentados" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Pulso</Form.Label>
                      <Form.Control
                        list="pulso-suggestions"
                        name="pulso"
                        value={formData.examen_fisico.pulso}
                        onChange={handleChange}
                        placeholder="Ej. Fuerte"
                      />
                      <datalist id="pulso-suggestions">
                        <option value="Fuerte" />
                        <option value="Débil" />
                        <option value="Normal" />
                      </datalist>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mucosas</Form.Label>
                      <Form.Control
                        list="mucosas-suggestions"
                        name="mucosas"
                        value={formData.examen_fisico.mucosas}
                        onChange={handleChange}
                        placeholder="Ej. Rosadas y húmedas"
                      />
                      <datalist id="mucosas-suggestions">
                        <option value="Rosadas y húmedas" />
                        <option value="Pálidas" />
                        <option value="Cianóticas" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Palpitación</Form.Label>
                      <Form.Control
                        list="palpitacion-suggestions"
                        name="palpitacion"
                        value={formData.examen_fisico.palpitacion}
                        onChange={handleChange}
                        placeholder="Ej. Normal"
                      />
                      <datalist id="palpitacion-suggestions">
                        <option value="Normal" />
                        <option value="Irregular" />
                        <option value="Acelerada" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Dentadura</Form.Label>
                      <Form.Control
                        list="dentadura-suggestions"
                        name="dentadura"
                        value={formData.examen_fisico.dentadura}
                        onChange={handleChange}
                        placeholder="Ej. Completa"
                      />
                      <datalist id="dentadura-suggestions">
                        <option value="Completa" />
                        <option value="Incompleta" />
                        <option value="Con problemas" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Encías</Form.Label>
                      <Form.Control
                        list="encias-suggestions"
                        name="encias"
                        value={formData.examen_fisico.encias}
                        onChange={handleChange}
                        placeholder="Ej. Saludables"
                      />
                      <datalist id="encias-suggestions">
                        <option value="Saludables" />
                        <option value="Inflamadas" />
                        <option value="Sangrantes" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Sarro</Form.Label>
                      <Form.Control
                        list="sarro-suggestions"
                        name="sarro"
                        value={formData.examen_fisico.sarro}
                        onChange={handleChange}
                        placeholder="Ej. Leve"
                      />
                      <datalist id="sarro-suggestions">
                        <option value="Leve" />
                        <option value="Moderado" />
                        <option value="Severo" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Ojos</Form.Label>
                      <Form.Control
                        list="ojos-suggestions"
                        name="ojos"
                        value={formData.examen_fisico.ojos}
                        onChange={handleChange}
                        placeholder="Ej. Claros"
                      />
                      <datalist id="ojos-suggestions">
                        <option value="Claros" />
                        <option value="Rojos" />
                        <option value="Nublados" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Orejas</Form.Label>
                      <Form.Control
                        list="orejas-suggestions"
                        name="orejas"
                        value={formData.examen_fisico.orejas}
                        onChange={handleChange}
                        placeholder="Ej. Limpias"
                      />
                      <datalist id="orejas-suggestions">
                        <option value="Limpias" />
                        <option value="Con secreción" />
                        <option value="Inflamadas" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Piel y Pelo</Form.Label>
                      <Form.Control
                        list="piel_y_pelo-suggestions"
                        name="piel_y_pelo"
                        value={formData.examen_fisico.piel_y_pelo}
                        onChange={handleChange}
                        placeholder="Ej. Saludable"
                      />
                      <datalist id="piel_y_pelo-suggestions">
                        <option value="Saludable" />
                        <option value="Con irritación" />
                        <option value="Seco" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Observaciones</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="observaciones"
                        value={formData.examen_fisico.observaciones}
                        onChange={handleChange}
                        placeholder="Ej. Ninguna anormalidad detectada"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Col>
        </Row>

        <div className="d-flex justify-content-end mt-4">
          <Button
            variant="outline-secondary"
            onClick={handleCerrar}
            className="me-2"
            disabled={isSubmitting}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-save-fill me-2"></i>{editar ? "Guardar Cambios" : "Guardar Consulta"}
          </Button>
        </div>
      </Form>

      <Modal
        show={mostrarModalConfirmacion}
        onHide={() => {
          setMostrarModalConfirmacion(false);
          if (editar) onClose();
          else onComplete();
        }}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header className="border-0">
          <Modal.Title><i className="bi bi-calendar-check-fill me-2"></i>Confirmar cita</Modal.Title>
          <Button
            variant="primary"
            className="close-btn text-white"
            onClick={() => {
              setMostrarModalConfirmacion(false);
              if (editar) onClose();
              else onComplete();
            }}
          >
            <i className="bi bi-x"></i>
          </Button>
        </Modal.Header>
        <Modal.Body>
          ¿Deseas agendar una cita para el próximo control en {formData.proximo_control_fecha} a las{" "}
          {formData.proximo_control_hora}?
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={() => {
              setMostrarModalConfirmacion(false);
              if (editar) onClose();
              else onComplete();
            }}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>No, solo guardar consulta
          </Button>
          <Button
            variant="success"
            onClick={agendarCita}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-check-circle-fill me-2"></i>Sí, agendar cita
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}