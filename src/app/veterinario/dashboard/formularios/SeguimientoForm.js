
"use client";
import { useState, useEffect } from "react";
import { Form, Button, Row, Col, Modal, Alert } from "react-bootstrap";
import { parse, isValid, differenceInMinutes, format } from "date-fns";
import "bootstrap/dist/css/bootstrap.min.css";

export default function SeguimientoForm({ mascota, propietario, data = {}, editar = false, onSave, onComplete, onClose }) {
  const [formData, setFormData] = useState({
    mascota_id: mascota._id || mascota.id,
    veterinario_id: "",
    fecha: data.fecha ? format(new Date(data.fecha), "yyyy-MM-dd") : new Date().toISOString().slice(0, 10),
    tipo: data.tipo || "",
    motivo: data.motivo || "",
    detalles: data.detalles || "",
    precio: data.precio || 50, // Precio por defecto para seguimiento
    estado: data.estado || "pendiente", // Estado de pago por defecto
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
  });

  const [mostrarExamenFisico, setMostrarExamenFisico] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [errors, setErrors] = useState({});
  const [reservas, setReservas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seguimientoGuardado, setSeguimientoGuardado] = useState(false);
  const [intentoCerrar, setIntentoCerrar] = useState(false);

  const veterinario = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        if (!veterinario?.id) {
          throw new Error("ID del veterinario no definido.");
        }
        const res = await fetch(`https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas/veterinario/${veterinario.id}`);
        const data = await res.json();
        const transformadas = data.map((r) => ({ ...r, fecha: new Date(r.fecha) }));
        setReservas(transformadas);
      } catch (err) {
        console.error("Error cargando reservas:", err);
        setErrors({ general: "❌ Error cargando reservas: " + err.message });
      }
    };
    if (veterinario?.id) {
      cargarReservas();
    }
  }, [veterinario?.id]);

  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/servicios");
        const data = await res.json();
        setServicios(data);
      } catch (err) {
        console.error("Error cargando servicios:", err);
        setErrors({ general: "❌ Error cargando servicios: " + err.message });
      }
    };
    cargarServicios();
  }, []);

  const validateNumber = (value, fieldName) => {
    if (value === "") return true; // Permitir campos vacíos (opcional)
    const regex = /^\d*\.?\d*$/;
    const isValidNumber = regex.test(value) && !isNaN(parseFloat(value));
    if (!isValidNumber) return "Debe ser un número válido.";
    if (fieldName === "precio" && parseFloat(value) < 0) return "El precio no puede ser negativo.";
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    if (name === "precio") {
      const validationResult = validateNumber(value, name);
      if (validationResult !== true) {
        newErrors[name] = validationResult;
      } else {
        delete newErrors[name];
      }
    } else if (["tipo", "fecha"].includes(name)) {
      delete newErrors[name];
    } else if (["temperatura", "peso", "frecuencia_cardiaca", "frecuencia_respiratoria", "presion_arterial"].includes(name)) {
      const validationResult = validateNumber(value);
      if (validationResult !== true) {
        newErrors[name] = `${name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ")}: Debe ser un número válido.`;
      } else {
        delete newErrors[name];
      }
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
      return {
        isValid: false,
        error: "⚠️ Solo se pueden agendar citas entre las 07:00 y las 21:00.",
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaHora < hoy) {
      return { isValid: false, error: "⚠️ No puedes agendar citas en fechas pasadas." };
    }

    const conflicto = reservas.some((r) => {
      const diff = Math.abs(differenceInMinutes(fechaHora, new Date(r.fecha)));
      return diff < 60;
    });

    if (conflicto) {
      return { isValid: false, error: "⚠️ Ya hay una cita dentro del rango de 1 hora." };
    }

    const servicioSeguimiento = servicios.find((s) => s.nombre.trim().toLowerCase().includes("seguimiento"));
    if (!servicioSeguimiento) {
      return { isValid: false, error: "❌ No se encontró el servicio de Seguimiento." };
    }

    return { isValid: true, fechaHora, servicioSeguimiento };
  };

  const agendarCita = async () => {
    console.log("agendarCita ejecutado", {
      fecha: formData.proximo_control_fecha,
      hora: formData.proximo_control_hora,
    });
    setErrors({});

    const validacion = validarCita();
    if (!validacion.isValid) {
      setErrors({ general: validacion.error });
      return;
    }

    const { fechaHora, servicioSeguimiento } = validacion;

    if (!veterinario) {
      setErrors({ general: "❌ No se encontró información del veterinario. Por favor, inicia sesión nuevamente." });
      return;
    }

    const cita = {
      cliente_id: propietario.id,
      mascota_id: mascota._id || mascota.id,
      veterinario_id: veterinario.id,
      servicio_id: servicioSeguimiento.id,
      fecha: format(fechaHora, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("https://servicios-veterinarios.onrender.com/api/servicios-veterinarios/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cita),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al agendar cita");

      console.log("Cita agendada con éxito");
      setErrors({ success: "✅ Cita agendada con éxito." });
      setMostrarModalConfirmacion(false);
      setIntentoCerrar(false);
      setSeguimientoGuardado(false);
      if (editar) {
        onClose();
      } else {
        onComplete();
      }
    } catch (err) {
      console.error("Error en agendarCita:", err);
      setErrors({ general: "❌ Error al agendar cita: " + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const marcarComoPagado = async () => {
    if (!data._id) {
      setErrors({ general: "ID del seguimiento no definido." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/seguimientos/${data._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "pagado" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar el estado de pago");
      setFormData((prev) => ({ ...prev, estado: "pagado" }));
      setErrors({ success: "✅ Seguimiento marcado como pagado con éxito." });
    } catch (err) {
      setErrors({ general: `❌ Error al marcar como pagado: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("handleSubmit ejecutado - Inicio guardado de seguimiento");
    setIsSubmitting(true);
    setErrors({});

    const newErrors = {};
    if (!formData.fecha) {
      newErrors.fecha = "Fecha es obligatoria.";
    }
    if (!formData.tipo) {
      newErrors.tipo = "Tipo es obligatorio.";
    }
    const precioValidation = validateNumber(formData.precio, "precio");
    if (precioValidation !== true) {
      newErrors.precio = `Precio: ${precioValidation}`;
    }
    ["temperatura", "peso", "frecuencia_cardiaca", "frecuencia_respiratoria", "presion_arterial"].forEach((field) => {
      const validationResult = validateNumber(formData.examen_fisico[field]);
      if (validationResult !== true) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ")}: Debe ser un número válido.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    if (!veterinario) {
      setErrors({ general: "❌ No se encontró información del veterinario. Por favor, inicia sesión nuevamente." });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      veterinario_id: veterinario.id,
      precio: formData.precio ? parseFloat(formData.precio) : undefined,
      examen_fisico: {
        ...formData.examen_fisico,
        temperatura: formData.examen_fisico.temperatura ? parseFloat(formData.examen_fisico.temperatura) : undefined,
        peso: formData.examen_fisico.peso ? parseFloat(formData.examen_fisico.peso) : undefined,
        frecuencia_cardiaca: formData.examen_fisico.frecuencia_cardiaca ? parseFloat(formData.examen_fisico.frecuencia_cardiaca) : undefined,
        frecuencia_respiratoria: formData.examen_fisico.frecuencia_respiratoria ? parseFloat(formData.examen_fisico.frecuencia_respiratoria) : undefined,
        presion_arterial: formData.examen_fisico.presion_arterial ? parseFloat(formData.examen_fisico.presion_arterial) : undefined,
      },
      proximo_control: formData.proximo_control_fecha && formData.proximo_control_hora
        ? parse(`${formData.proximo_control_fecha} ${formData.proximo_control_hora}`, "yyyy-MM-dd HH:mm", new Date())
        : undefined,
      proximo_control_fecha: undefined,
      proximo_control_hora: undefined,
    };

    try {
      if (editar) {
        if (!data._id) {
          throw new Error("ID del seguimiento no definido.");
        }
        const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/seguimientos/${data._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar el seguimiento");
        setErrors({ success: "✅ Seguimiento actualizado con éxito." });
        setSeguimientoGuardado(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (editar)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, cerrando formulario (editar)");
          setSeguimientoGuardado(false);
          onClose();
        }
      } else {
        await onSave(payload);
        setErrors({ success: "✅ Seguimiento creado con éxito." });
        setSeguimientoGuardado(true);
        if (formData.proximo_control_fecha && formData.proximo_control_hora) {
          console.log("Mostrando modal de confirmación para cita (crear)");
          setMostrarModalConfirmacion(true);
        } else {
          console.log("No se ingresó próximo control, completando flujo (crear)");
          setSeguimientoGuardado(false);
          onComplete();
        }
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setErrors({ general: `❌ Error al guardar el seguimiento: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrar = () => {
    console.log("handleCerrar ejecutado", {
      proximo_control_fecha: formData.proximo_control_fecha,
      proximo_control_hora: formData.proximo_control_hora,
    });
    setIntentoCerrar(true);

    if (formData.proximo_control_fecha && formData.proximo_control_hora) {
      console.log("Mostrando modal de confirmación antes de cerrar");
      setMostrarModalConfirmacion(true);
    } else {
      console.log("No se ingresó próximo control, cerrando formulario");
      setIntentoCerrar(false);
      setSeguimientoGuardado(false);
      if (editar) {
        onClose();
      } else {
        onComplete();
      }
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
              {Object.values(errors).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-file-medical me-2"></i>Tipo</Form.Label>
              <Form.Control
                list="tipo-suggestions"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
                placeholder="Tipo de seguimiento"
              />
              <datalist id="tipo-suggestions">
                <option value="Control post-quirúrgico" />
                <option value="Revisión de rutina" />
                <option value="Seguimiento de tratamiento" />
                <option value="Evaluación de emergencia" />
              </datalist>
            </Form.Group>
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
              <Form.Label><i className="bi bi-chat-square-text me-2"></i>Motivo</Form.Label>
              <Form.Control
                name="motivo"
                as="textarea"
                value={formData.motivo}
                onChange={handleChange}
                placeholder="Motivo del seguimiento"
              />
              <datalist id="motivo-suggestions">
                <option value="Seguimiento post-operatorio" />
                <option value="Control de enfermedad crónica" />
                <option value="Evaluación de síntomas" />
                <option value="Revisión de medicamentos" />
              </datalist>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><i className="bi bi-file-text me-2"></i>Detalles</Form.Label>
              <Form.Control
                name="detalles"
                as="textarea"
                value={formData.detalles}
                onChange={handleChange}
                placeholder="Detalles del seguimiento"
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
                placeholder="Ej. 50.00"
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
                        name="temperatura"
                        type="number"
                        step="0.1"
                        value={formData.examen_fisico.temperatura}
                        onChange={handleChange}
                        placeholder="Ej. 38.5"
                      />
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
                        name="peso"
                        type="number"
                        step="0.1"
                        value={formData.examen_fisico.peso}
                        onChange={handleChange}
                        placeholder="Ej. 10.5"
                      />
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
                        name="frecuencia_cardiaca"
                        type="number"
                        value={formData.examen_fisico.frecuencia_cardiaca}
                        onChange={handleChange}
                        placeholder="Ej. 80"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Frecuencia Respiratoria</Form.Label>
                      <Form.Control
                        name="frecuencia_respiratoria"
                        type="number"
                        value={formData.examen_fisico.frecuencia_respiratoria}
                        onChange={handleChange}
                        placeholder="Ej. 20"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Presión Arterial</Form.Label>
                      <Form.Control
                        name="presion_arterial"
                        type="number"
                        value={formData.examen_fisico.presion_arterial}
                        onChange={handleChange}
                        placeholder="Ej. 120"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Reflejos</Form.Label>
                      <Form.Control
                        list="reflejos-suggestions"
                        name="reflejos"
                        value={formData.examen_fisico.reflejos}
                        onChange={handleChange}
                        placeholder="Estado de los reflejos"
                      />
                      <datalist id="reflejos-suggestions">
                        <option value="Normales" />
                        <option value="Disminuidos" />
                        <option value="Ausentes" />
                        <option value="Exagerados" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Pulso</Form.Label>
                      <Form.Control
                        list="pulso-suggestions"
                        name="pulso"
                        value={formData.examen_fisico.pulso}
                        onChange={handleChange}
                        placeholder="Calidad del pulso"
                      />
                      <datalist id="pulso-suggestions">
                        <option value="Fuerte" />
                        <option value="Débil" />
                        <option value="Regular" />
                        <option value="Irregular" />
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
                        placeholder="Estado de las mucosas"
                      />
                      <datalist id="mucosas-suggestions">
                        <option value="Rosadas" />
                        <option value="Pálidas" />
                        <option value="Cianóticas" />
                        <option value="Ictéricas" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Palpitación</Form.Label>
                      <Form.Control
                        name="palpitacion"
                        value={formData.examen_fisico.palpitacion}
                        onChange={handleChange}
                        placeholder="Observaciones de palpitación"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Dentadura</Form.Label>
                      <Form.Control
                        list="dentadura-suggestions"
                        name="dentadura"
                        value={formData.examen_fisico.dentadura}
                        onChange={handleChange}
                        placeholder="Estado de la dentadura"
                      />
                      <datalist id="dentadura-suggestions">
                        <option value="Normal" />
                        <option value="Desgaste leve" />
                        <option value="Desgaste severo" />
                        <option value="Dientes ausentes" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Encías</Form.Label>
                      <Form.Control
                        list="encias-suggestions"
                        name="encias"
                        value={formData.examen_fisico.encias}
                        onChange={handleChange}
                        placeholder="Estado de las encías"
                      />
                      <datalist id="encias-suggestions">
                        <option value="Rosadas y firmes" />
                        <option value="Inflamadas" />
                        <option value="Sangrantes" />
                        <option value="Pálidas" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Sarro</Form.Label>
                      <Form.Control
                        list="sarro-suggestions"
                        name="sarro"
                        value={formData.examen_fisico.sarro}
                        onChange={handleChange}
                        placeholder="Presencia de sarro"
                      />
                      <datalist id="sarro-suggestions">
                        <option value="Ausente" />
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
                        placeholder="Estado de los ojos"
                      />
                      <datalist id="ojos-suggestions">
                        <option value="Normales" />
                        <option value="Conjuntivitis" />
                        <option value="Opacidad" />
                        <option value="Secreción" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Orejas</Form.Label>
                      <Form.Control
                        list="orejas-suggestions"
                        name="orejas"
                        value={formData.examen_fisico.orejas}
                        onChange={handleChange}
                        placeholder="Estado de las orejas"
                      />
                      <datalist id="orejas-suggestions">
                        <option value="Limpias" />
                        <option value="Otitis" />
                        <option value="Secreción" />
                        <option value="Inflamación" />
                      </datalist>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Piel y Pelo</Form.Label>
                      <Form.Control
                        list="piel_y_pelo-suggestions"
                        name="piel_y_pelo"
                        value={formData.examen_fisico.piel_y_pelo}
                        onChange={handleChange}
                        placeholder="Estado de piel y pelo"
                      />
                      <datalist id="piel_y_pelo-suggestions">
                        <option value="Normal" />
                        <option value="Dermatitis" />
                        <option value="Pérdida de pelo" />
                        <option value="Lesiones cutáneas" />
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
                        placeholder="Observaciones adicionales"
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
            <i className="bi bi-save-fill me-2"></i>{editar ? "Guardar Cambios" : "Guardar Seguimiento"}
          </Button>
        </div>
      </Form>

      <Modal
        show={mostrarModalConfirmacion}
        onHide={() => {
          console.log("onHide modal confirmación ejecutado");
          setMostrarModalConfirmacion(false);
          setIntentoCerrar(false);
          if (seguimientoGuardado || intentoCerrar) {
            if (editar) {
              onClose();
            } else {
              onComplete();
            }
          }
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
              console.log("Botón cerrar modal clicado");
              setMostrarModalConfirmacion(false);
              setIntentoCerrar(false);
              if (seguimientoGuardado || intentoCerrar) {
                if (editar) {
                  onClose();
                } else {
                  onComplete();
                }
              }
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
              console.log("Botón 'No' clicado");
              setMostrarModalConfirmacion(false);
              setIntentoCerrar(false);
              if (editar) {
                onClose();
              } else {
                onComplete();
              }
            }}
            style={buttonStyle}
            {...buttonHover}
          >
            <i className="bi bi-x-circle-fill me-2"></i>No, solo guardar seguimiento
          </Button>
          <Button
            variant="success"
            onClick={() => {
              console.log("Botón 'Sí' clicado");
              agendarCita();
            }}
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
