"use client";
import { useState, useEffect } from "react";
import { Container, Row, Col, ListGroup, Table, Button, Modal, Collapse, Alert, Spinner } from "react-bootstrap";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";

import CirugiaForm from "./formularios/CirugiaForm";
import ConsultaForm from "./formularios/ConsultaForm";
import LaboratorioForm from "./formularios/LaboratorioForm";
import MedicamentoForm from "./formularios/MedicamentoForm";
import SeguimientoForm from "./formularios/SeguimientoForm";
import PeluqueriaForm from "./formularios/PeluqueriaForm";

export default function ServiciosMascota({ setView }) {
  const mascota = JSON.parse(localStorage.getItem("mascota_servicio"));
  const propietario = JSON.parse(localStorage.getItem("propietario_servicio"));
  const [servicioSeleccionado, setServicioSeleccionado] = useState("consultas");
  const [data, setData] = useState([]);
  const [modalVer, setModalVer] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [servicioActual, setServicioActual] = useState(null);
  const [openExamenFisico, setOpenExamenFisico] = useState({});
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}/${mascota._id || mascota.id}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      const newData = await res.json();
      setData(newData || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setData([]);
      setAlertMsg({ type: "danger", text: "❌ Error al cargar datos: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [servicioSeleccionado]);

  const handleGuardar = async (nuevo) => {
    console.log("handleGuardar ejecutado en ServiciosMascota", nuevo);
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuevo, mascota_id: mascota._id || mascota.id }),
      });
      if (!res.ok) throw new Error("Error al guardar el servicio");
      await fetchData();
      setAlertMsg({ type: "success", text: "✅ Servicio creado correctamente." });
    } catch (err) {
      console.error("Error en handleGuardar:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al guardar el servicio: " + err.message });
    } finally {
      setLoading(false);
      setModalCrear(false); // Cierra siempre al final
    }
  };

  const handleCompletar = () => {
    console.log("handleCompletar ejecutado, cerrando modalCrear");
    setModalCrear(false);
    fetchData();
  };

  const handleEditar = async (editado) => {
    console.log("handleEditar ejecutado en ServiciosMascota", editado);
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}/${servicioActual._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editado),
      });
      if (!res.ok) throw new Error("Error al editar el servicio");
      await fetchData();
      setAlertMsg({ type: "success", text: "✅ Servicio actualizado correctamente." });
    } catch (err) {
      console.error("Error en handleEditar:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al editar el servicio: " + err.message });
    } finally {
      setLoading(false);
      setModalEditar(false); // Cierra siempre al final (movido de try a finally)
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`https://mascota-service.onrender.com/api/mascotas/${servicioSeleccionado}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar el servicio");
      await fetchData();
      setAlertMsg({ type: "success", text: "🗑 Servicio eliminado correctamente." });
    } catch (err) {
      console.error("Error en handleEliminar:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al eliminar el servicio: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleExamenFisico = (id) => {
    setOpenExamenFisico((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 📄 FUNCIÓN MEJORADA PARA GENERAR PDF PROFESIONAL
  const handleImprimir = async (item) => {
    try {
      const doc = new jsPDF();
      
      // ========== COLORES PROFESIONALES ==========
      const colorPrimario = [0, 128, 255];      // Azul corporativo
      const colorSecundario = [16, 185, 129];   // Verde médico
      const colorGrisOscuro = [51, 51, 51];     // Texto principal
      const colorGrisClaro = [245, 245, 245];   // Fondos
      const colorBlanco = [255, 255, 255];
      
      let yPos = 20;

      // ========== ENCABEZADO CON LOGO Y TÍTULO ==========
      try {
        const logoUrl = "https://i.postimg.cc/13XLcjyv/imagen-2025-09-30-163600354.png"; // Cambiado a la URL del header para consistencia (válida)
        const logoImg = await fetch(logoUrl)
          .then(res => res.blob())
          .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          }));
        
        doc.addImage(logoImg, "PNG", 15, 15, 25, 25); // Cambiado a PNG asumiendo formato
      } catch (error) {
        console.warn("No se pudo cargar el logo:", error);
      }

      // Título principal con color corporativo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.text("VIDAPETS", 105, 25, { align: "center" });
      
      // Subtítulo
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
      doc.text("Clínica Veterinaria Profesional", 105, 32, { align: "center" });
      doc.text("JJ3J+27 Chulchucani, Carrasco", 105, 37, { align: "center" });
      doc.text("Tel: +591 60371104 | Email: lokiangelo21@gmail.com", 105, 42, { align: "center" });
      
      // Línea decorativa con color primario
      doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.setLineWidth(0.8);
      doc.line(15, 48, 195, 48);
      
      yPos = 58;

      // ========== SECCIÓN DE INFORMACIÓN CON CAJAS DE COLOR ==========
      // Caja de fondo gris claro
      doc.setFillColor(colorGrisClaro[0], colorGrisClaro[1], colorGrisClaro[2]);
      doc.roundedRect(15, yPos, 85, 35, 3, 3, "F");
      doc.roundedRect(105, yPos, 85, 35, 3, 3, "F");
      
      // Borde azul para propietario
      doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, yPos, 85, 35, 3, 3, "S");
      
      // Borde verde para mascota
      doc.setDrawColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
      doc.roundedRect(105, yPos, 85, 35, 3, 3, "S");
      
      // PROPIETARIO (Columna izquierda)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.text("DATOS DEL PROPIETARIO", 20, yPos + 7);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
      doc.text(`Nombre: ${propietario.nombre || "N/D"}`, 20, yPos + 14);
      doc.text(`ID: ${propietario.identificacion || "N/D"}`, 20, yPos + 19);
      doc.text(`Teléfono: ${propietario.telefono || "N/D"}`, 20, yPos + 24);
      doc.text(`Email: ${propietario.email || "N/D"}`, 20, yPos + 29);

      // MASCOTA (Columna derecha)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
      doc.text("DATOS DE LA MASCOTA", 110, yPos + 7);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
      doc.text(`Nombre: ${mascota.nombre || "N/D"}`, 110, yPos + 14);
      doc.text(`Especie: ${mascota.especie || "N/D"} | Raza: ${mascota.raza || "N/D"}`, 110, yPos + 19);
      doc.text(`Género: ${mascota.genero || "N/D"} | Edad: ${mascota.edad || "N/D"}`, 110, yPos + 24);
      doc.text(`Color: ${mascota.color || "N/D"} | Talla: ${mascota.talla || "N/D"}`, 110, yPos + 29);

      yPos += 43;

      // ========== TÍTULO DEL REPORTE ==========
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.text(`REPORTE DE ${servicioSeleccionado.toUpperCase()}`, 105, yPos, { align: "center" });
      
      // Fecha de emisión
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
      doc.text(`Fecha de emisión: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 195, yPos, { align: "right" });
      
      yPos += 12;

      // ========== TABLA DE DATOS DEL SERVICIO ==========
      // Encabezado de tabla
      doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      doc.rect(15, yPos, 180, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(colorBlanco[0], colorBlanco[1], colorBlanco[2]);
      doc.text("Campo", 20, yPos + 5.5);
      doc.text("Información", 90, yPos + 5.5);
      
      yPos += 8;
      
      // Datos en formato tabla
      let esFilaPar = true;
      const alturaFila = 7;
      
      for (const [key, value] of Object.entries(item)) {
        // Saltar campos internos
        if (key === "_id" || key === "createdAt" || key === "updatedAt" || key === "mascota_id" || key === "__v") continue;
        
        // Verificar si necesitamos nueva página
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
          esFilaPar = true;
        }
        
        // Color de fondo alternado
        if (esFilaPar) {
          doc.setFillColor(colorGrisClaro[0], colorGrisClaro[1], colorGrisClaro[2]);
          doc.rect(15, yPos, 180, alturaFila, "F");
        }
        
        // Procesar objetos anidados (como examen_fisico)
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          // Título de la sección (ej: "Examen Fisico")
          doc.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
          doc.rect(15, yPos, 180, alturaFila, "F");
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(colorBlanco[0], colorBlanco[1], colorBlanco[2]);
          doc.text(key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "), 20, yPos + 5);
          
          yPos += alturaFila;
          esFilaPar = true;
          
          // Sub-items del objeto
          for (const [subKey, subValue] of Object.entries(value)) {
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
              esFilaPar = true;
            }
            
            if (esFilaPar) {
              doc.setFillColor(colorGrisClaro[0], colorGrisClaro[1], colorGrisClaro[2]);
              doc.rect(15, yPos, 180, alturaFila, "F");
            }
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
            doc.text(`  ${subKey.charAt(0).toUpperCase() + subKey.slice(1).replace(/_/g, " ")}`, 20, yPos + 5);
            doc.text(String(subValue || "N/D"), 90, yPos + 5);
            
            yPos += alturaFila;
            esFilaPar = !esFilaPar;
          }
        } else {
          // Procesar valores simples
          let displayValue = value;
          
          if (key.includes("fecha") && value) {
            try {
              displayValue = format(new Date(value), "dd/MM/yyyy", { locale: es });
            } catch (e) {
              displayValue = String(value);
            }
          } else if (Array.isArray(value)) {
            if (key === "medicamentos" && value.length > 0) {
              displayValue = value.map(m => m.nombre || m).join(", ");
            } else {
              displayValue = value.join(", ") || "N/D";
            }
          }
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
          doc.text(key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "), 20, yPos + 5);
          
          doc.setFont("helvetica", "normal");
          // Dividir texto largo en múltiples líneas
          const textoLargo = String(displayValue || "N/D");
          const lineasTexto = doc.splitTextToSize(textoLargo, 100);
          doc.text(lineasTexto, 90, yPos + 5);
          
          // Ajustar altura si hay múltiples líneas
          if (lineasTexto.length > 1) {
            yPos += (lineasTexto.length - 1) * 5;
          }
          
          yPos += alturaFila;
          esFilaPar = !esFilaPar;
        }
      }
      
      // Borde de la tabla
      doc.setDrawColor(colorGrisOscuro[0], colorGrisOscuro[1], colorGrisOscuro[2]);
      doc.setLineWidth(0.3);
      doc.rect(15, 78, 180, yPos - 78);

      // ========== PIE DE PÁGINA PROFESIONAL ==========
      const totalPaginas = doc.internal.getNumberOfPages();
      
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        
        // Línea decorativa superior
        doc.setDrawColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
        doc.setLineWidth(0.5);
        doc.line(15, 280, 195, 280);
        
        // Texto del footer
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text("VIDAPETS - Cuidando la salud de tu mascota con profesionalismo", 105, 287, { align: "center" });
        doc.text(`Página ${i} de ${totalPaginas}`, 195, 287, { align: "right" });
        
        // Icono decorativo
        doc.setFontSize(10);
        doc.text("🐾", 15, 287);
      }

      // Guardar PDF
      const nombreArchivo = `${servicioSeleccionado}_${mascota.nombre}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
      doc.save(nombreArchivo);
      
      setAlertMsg({ type: "success", text: "✅ PDF generado exitosamente." });
    } catch (err) {
      console.error("Error generando PDF:", err);
      setAlertMsg({ type: "danger", text: "❌ Error al generar PDF: " + (err.message || err) });
    }
  };

  const renderFormulario = (modo, data = {}) => {
    const props = {
      mascota,
      propietario,
      data,
      editar: modo === "editar",
      onSave: modo === "editar" ? handleEditar : handleGuardar,
      onComplete: handleCompletar,
      onClose: () => {
        console.log("onClose ejecutado desde ServiciosMascota");
        setModalCrear(false);
        setModalEditar(false);
        fetchData();
      },
    };
    switch (servicioSeleccionado) {
      case "consultas":
        return <ConsultaForm {...props} />;
      case "labo":
        return <LaboratorioForm {...props} />;
      case "cirugias":
        return <CirugiaForm {...props} />;
      case "medicamentos":
        return <MedicamentoForm {...props} />;
      case "seguimientos":
        return <SeguimientoForm {...props} />;
      case "peluqueria":
        return <PeluqueriaForm {...props} />;
      default:
        return <div>Error: Servicio no válido</div>;
    }
  };

  const serviceFields = {
    consultas: [
      { key: "fecha", label: "Fecha" },
      { key: "motivo", label: "Motivo" },
      { key: "objetivo", label: "Objetivo" },
      { key: "plan_terapeutico", label: "Plan Terapéutico" },
    ],
    labo: [
      { key: "fecha", label: "Fecha" },
      { key: "prueba", label: "Prueba" },
      { key: "diagnostico_presuntivo", label: "Diagnóstico Presuntivo" },
      { key: "encargado", label: "Encargado" },
    ],
    cirugias: [
      { key: "fecha", label: "Fecha" },
      { key: "procedimiento", label: "Procedimiento" },
      { key: "descripcion_quirurgica", label: "Descripción Quirúrgica" },
      { key: "anestesico", label: "Anestésico" },
    ],
    medicamentos: [
      { key: "fecha", label: "Fecha" },
      { key: "diagnostico", label: "Diagnóstico" },
      { key: "medicamentos", label: "Medicamentos" },
    ],
    seguimientos: [
      { key: "fecha", label: "Fecha" },
      { key: "tipo", label: "Tipo" },
      { key: "motivo", label: "Motivo" },
      { key: "detalles", label: "Detalles" },
    ],
    peluqueria: [
      { key: "fecha", label: "Fecha" },
      { key: "servicio", label: "Servicio" },
      { key: "motivo", label: "Motivo" },
      { key: "encargado", label: "Encargado" },
    ],
  };

  const renderTable = () => {
    const fields = serviceFields[servicioSeleccionado] || [];
    const hasExamenFisico = ["consultas", "seguimientos"].includes(servicioSeleccionado);

    return (
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
              {fields.map((field, i) => (
                <th key={i} style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  textAlign: "center"
                }}>
                  <i className={`bi bi-${field.key === "fecha" ? "calendar-event" : "clipboard-check"} me-2`}></i>
                  {field.label}
                </th>
              ))}
              {hasExamenFisico && (
                <th style={{ 
                  padding: "1rem", 
                  background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                  border: "none", 
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  textAlign: "center"
                }}>
                  <i className="bi bi-heart-pulse-fill me-2"></i>Examen Físico
                </th>
              )}
              <th style={{ 
                padding: "1rem", 
                background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                border: "none", 
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                textAlign: "center",
                borderRadius: "0 8px 0 0" 
              }}>
                <i className="bi bi-gear-fill me-2"></i>Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={fields.length + (hasExamenFisico ? 2 : 1)} className="text-center">
                  <Spinner animation="border" variant="primary" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={fields.length + (hasExamenFisico ? 2 : 1)} className="text-center text-muted">
                  Sin registros
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <>
                  <tr
                    key={idx}
                    style={{
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
                    {fields.map((field, j) => (
                      <td key={j} style={{ padding: "0.8rem", color: "#212529", border: "none", textAlign: "center" }}>
                        {field.key.includes("fecha")
                          ? format(new Date(item[field.key] || item.createdAt), "dd/MM/yyyy", { locale: es })
                          : field.key === "medicamentos"
                          ? item[field.key]?.map(m => m.nombre).join(", ") || "-"
                          : item[field.key] || "-"}
                      </td>
                    ))}
                    {hasExamenFisico && (
                      <td style={{ padding: "0.8rem", color: "#212529", border: "none", textAlign: "center" }}>
                        {item.examen_fisico && Object.values(item.examen_fisico).some(val => val) && (
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => toggleExamenFisico(item._id || item.id)}
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
                            <i className="bi bi-eye-fill me-1"></i> Ver Examen
                          </Button>
                        )}
                      </td>
                    )}
                    <td style={{ padding: "0.8rem", border: "none", textAlign: "center" }}>
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => handleImprimir(item)}
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
                        <i className="bi bi-printer-fill me-1"></i>
                      </Button>{" "}
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => {
                          setServicioActual(item);
                          setModalEditar(true);
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
                        <i className="bi bi-pencil-fill me-1"></i>
                      </Button>{" "}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleEliminar(item._id || item.id)}
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
                        <i className="bi bi-trash-fill me-1"></i>
                      </Button>
                    </td>
                  </tr>
                  {hasExamenFisico && item.examen_fisico && (
                    <tr>
                      <td colSpan={fields.length + 2} style={{ border: "none" }}>
                        <Collapse in={openExamenFisico[item._id || item.id]}>
                          <div>
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
                                    {[
                                      { key: "temperatura", label: "Temperatura" },
                                      { key: "peso", label: "Peso" },
                                      { key: "frecuencia_cardiaca", label: "Frec. Cardiaca" },
                                      { key: "frecuencia_respiratoria", label: "Frec. Respiratoria" },
                                      { key: "mucosas", label: "Mucosas" },
                                      { key: "observaciones", label: "Observaciones" },
                                    ].map((field, k) => (
                                      <th key={k} style={{ 
                                        padding: "1rem", 
                                        background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", 
                                        border: "none", 
                                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                                        textAlign: "center"
                                      }}>{field.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr
                                    style={{
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
                                    {[
                                      "temperatura",
                                      "peso",
                                      "frecuencia_cardiaca",
                                      "frecuencia_respiratoria",
                                      "mucosas",
                                      "observaciones",
                                    ].map((key, k) => (
                                      <td key={k} style={{ padding: "0.8rem", color: "#212529", border: "none", textAlign: "center" }}>
                                        {item.examen_fisico[key] ? `${item.examen_fisico[key]} ${key === "temperatura" ? item.examen_fisico.unidad_temperatura : key === "peso" ? item.examen_fisico.unidad_peso : ""}` : "-"}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </Table>
                            </div>
                          </div>
                        </Collapse>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </Table>
      </div>
    );
  };

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
        {alertMsg && (
          <Alert
            variant={alertMsg.type}
            onClose={() => setAlertMsg(null)}
            dismissible
            className="shadow-sm"
          >
            {alertMsg.text}
          </Alert>
        )}
        <div className="d-flex align-items-center mb-4">
          <Button
            variant="secondary"
            onClick={() => setView("perfilMascota")}
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
            <i className="bi bi-arrow-left me-1"></i> Volver
          </Button>
          <h3 className="ms-3 mb-0 fw-bold">
            <i className="bi bi-clipboard-check-fill me-2"></i> Servicios de {mascota?.nombre}
          </h3>
        </div>
        <Row>
          <Col md={3}>
            <ListGroup className="bg-light border-secondary shadow-sm rounded">
              {[
                { key: "consultas", label: "🩺 Consultas", icon: "bi-heart-pulse-fill" },
                { key: "labo", label: "🧪 Laboratorio", icon: "bi-flask" },
                { key: "cirugias", label: "🔪 Cirugías", icon: "bi-scissors" },
                { key: "medicamentos", label: "💊 Medicamentos", icon: "bi-capsule" },
                { key: "seguimientos", label: "📋 Seguimientos", icon: "bi-clipboard-check" },
                { key: "peluqueria", label: "✂️ Peluquería", icon: "bi-scissors" },
              ].map(serv => (
                <ListGroup.Item
                  key={serv.key}
                  action
                  active={servicioSeleccionado === serv.key}
                  onClick={() => setServicioSeleccionado(serv.key)}
                  className={`text-dark ${servicioSeleccionado === serv.key ? "bg-primary" : "bg-light"} border-secondary`}
                  style={{ cursor: "pointer", transition: "background 0.2s ease" }}
                >
                  <i className={`bi ${serv.icon} me-2`}></i>
                  {serv.label}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
          <Col md={9}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-capitalize">
                <i className="bi bi-folder-fill me-2"></i>
                {servicioSeleccionado}
              </h5>
              <Button
                variant="success"
                onClick={() => setModalCrear(true)}
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
                <i className="bi bi-plus-circle-fill me-1"></i> Nuevo
              </Button>
            </div>
            {renderTable()}
          </Col>
        </Row>

        <Modal show={modalCrear} onHide={() => setModalCrear(false)} size="xl" centered style={{
          borderRadius: "16px",
          boxShadow: "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)",
          fontFamily: "Roboto, sans-serif",
        }}>
          <Modal.Header closeButton className="bg-light text-dark border-secondary">
            <Modal.Title>
              <i className="bi bi-plus-circle-fill me-2"></i> Crear
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light text-dark p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {renderFormulario("crear")}
          </Modal.Body>
        </Modal>

        <Modal show={modalEditar} onHide={() => setModalEditar(false)} size="xl" centered style={{
          borderRadius: "16px",
          boxShadow: "0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)",
          fontFamily: "Roboto, sans-serif",
        }}>
          <Modal.Header closeButton className="bg-light text-dark border-secondary">
            <Modal.Title>
              <i className="bi bi-pencil-fill me-2"></i> Editar
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light text-dark p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {renderFormulario("editar", servicioActual)}
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}