import { useEffect, useState } from "react";
import { Container, Form, Button, Row, Col, Table, Modal, Alert, Spinner, Pagination } from "react-bootstrap";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
            propietario: cliente ? {
              nombre: cliente.nombre,
              identificacion: cliente.identificacion || "N/D",
              telefono: cliente.telefono || "N/D",
              email: cliente.email || "N/D",
            } : { nombre: "Sin propietario" },
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
      let fieldA = a[sortField] || "";
      let fieldB = b[sortField] || "";
      if (sortField === "nombre_propietario") {
        fieldA = a.propietario.nombre || "";
        fieldB = b.propietario.nombre || "";
      }
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

  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Comprimir a JPEG con calidad 70%
        };
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file, 300, 300); // Redimensionar a max 300x300
        setFormulario({
          ...formulario,
          datos: { ...formulario.datos, etiqueta_vacuna: resizedBase64 },
        });
      } catch (err) {
        console.error("Error al redimensionar imagen:", err);
        setErrors({ general: "❌ Error al procesar la imagen." });
      }
    }
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
      if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
      setModalVisible(false);
      await buscarCartilla(seleccionada);
      setErrors({ success: "✅ Registro guardado correctamente." });
      setLoading(false);
    } catch (err) {
      setErrors({ general: `❌ Error al guardar el registro: ${err.message}` });
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
      if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
      setModalEditarVisible(false);
      await buscarCartilla(seleccionada);
      setErrors({ success: "✅ Registro actualizado correctamente." });
      setLoading(false);
    } catch (err) {
      setErrors({ general: `❌ Error al actualizar el registro: ${err.message}` });
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

  const toBase64Safe = async (url) => {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("⚠ No se pudo cargar la imagen:", url, err);
    return null;
  }
};

const handleImprimirCartilla = async () => {
  try {
    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // ============= ENCABEZADO PROFESIONAL =============
    // Logo (intentar cargar)
    try {
      const logoBase64 = await toBase64Safe("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNBUhLy6fYf34vlOEpIaGj2h76BzQhhjg89w&s");
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 15, 10, 25, 25);
      }
    } catch (e) {
      console.warn("⚠ Logo no cargado");
    }

    // Título y datos de la clínica
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("VIDAPETS", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Clínica Veterinaria", pageWidth / 2, 27, { align: "center" });
    doc.text("JJ3J+27 Chulchucani, Carrasco", pageWidth / 2, 32, { align: "center" });
    doc.text("Tel: +591 60371104 | Email: lokiangelo21@gmail.com", pageWidth / 2, 37, { align: "center" });
    
    // Línea decorativa
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(15, 42, pageWidth - 15, 42);
    
    currentY = 50;

    // ============= TÍTULO DE CARTILLA =============
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 73, 94);
    doc.text("CARTILLA SANITARIA", pageWidth / 2, currentY, { align: "center" });
    currentY += 12;

    // ============= SECCIÓN PROPIETARIO =============
    const propietario = seleccionada.propietario || {};
    
    doc.setFillColor(240, 248, 255);
    doc.rect(15, currentY - 5, pageWidth - 30, 28, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("DATOS DEL PROPIETARIO", 20, currentY);
    currentY += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${propietario.nombre || "N/D"}`, 20, currentY);
    doc.text(`Cédula: ${propietario.identificacion || "N/D"}`, 110, currentY);
    currentY += 6;
    doc.text(`Teléfono: ${propietario.telefono || "N/D"}`, 20, currentY);
    doc.text(`Email: ${propietario.email || "N/D"}`, 110, currentY);
    currentY += 12;

    // ============= SECCIÓN MASCOTA =============
    doc.setFillColor(255, 250, 240);
    doc.rect(15, currentY - 5, pageWidth - 30, 28, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(230, 126, 34);
    doc.text("DATOS DE LA MASCOTA", 20, currentY);
    currentY += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${seleccionada.nombre || "N/D"}`, 20, currentY);
    doc.text(`Especie: ${seleccionada.especie || "N/D"}`, 70, currentY);
    doc.text(`Raza: ${seleccionada.raza || "N/D"}`, 120, currentY);
    currentY += 6;
    doc.text(`Género: ${seleccionada.genero || "N/D"}`, 20, currentY);
    doc.text(`Color: ${seleccionada.color || "N/D"}`, 70, currentY);
    doc.text(`Edad: ${seleccionada.edad || "N/D"}`, 120, currentY);
    currentY += 6;
    doc.text(`Talla: ${seleccionada.talla || "N/D"}`, 20, currentY);
    doc.text(`Estado Reproductivo: ${seleccionada.estado_reproductivo || "N/D"}`, 70, currentY);
    currentY += 12;

    // ============= TABLA DE VACUNAS =============
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("REGISTRO DE VACUNACIONES", 20, currentY);
    currentY += 5;

    const vacunasData = (cartilla.vacunas || []).map((v) => {
      const row = [
        v.nombre || "N/D",
        v.fecha_aplicacion ? format(new Date(v.fecha_aplicacion), "dd/MM/yyyy", { locale: es }) : "N/D",
        v.fecha_refuerzo ? format(new Date(v.fecha_refuerzo), "dd/MM/yyyy", { locale: es }) : "N/D",
        "" // Espacio vacío para firma
      ];

      // Si hay etiqueta, agregar como celda especial
      if (v.etiqueta_vacuna && v.etiqueta_vacuna.startsWith("data:image")) {
        return [...row, { content: "", image: v.etiqueta_vacuna }];
      }
      return [...row, ""];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Vacuna", "Fecha Aplicación", "Fecha Refuerzo", "Firma Veterinario", "Etiqueta"]],
      body: vacunasData,
      theme: "striped",
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center"
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        minCellHeight: 15
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 50, halign: "center" }, // Columna de firma más ancha
        4: { cellWidth: 35, halign: "center" }
      },
      didDrawCell: (data) => {
        // Dibujar imágenes base64 en la columna de etiquetas
        if (data.column.index === 4 && data.cell.section === "body") {
          const rowData = vacunasData[data.row.index];
          if (rowData && rowData[4] && typeof rowData[4] === "object" && rowData[4].image) {
            try {
              const imgData = rowData[4].image;
              const cellX = data.cell.x + 2;
              const cellY = data.cell.y + 2;
              const imgWidth = data.cell.width - 4;
              const imgHeight = data.cell.height - 4;
              doc.addImage(imgData, "JPEG", cellX, cellY, imgWidth, imgHeight);
            } catch (e) {
              console.error("Error al insertar imagen en PDF:", e);
            }
          }
        }
        
        // Dibujar línea para firma en columna de firma
        if (data.column.index === 3 && data.cell.section === "body") {
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.2);
          const lineY = data.cell.y + data.cell.height - 3;
          doc.line(data.cell.x + 5, lineY, data.cell.x + data.cell.width - 5, lineY);
        }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // ============= TABLA DE ANTIPARASITARIOS =============
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(39, 174, 96);
    doc.text("REGISTRO DE ANTIPARASITARIOS", 20, currentY);
    currentY += 5;

    const desparasitacionesData = (cartilla.desparasitaciones || []).map(d => [
      d.fecha_aplicacion ? format(new Date(d.fecha_aplicacion), "dd/MM/yyyy", { locale: es }) : "N/D",
      d.peso_mascota ? `${d.peso_mascota} kg` : "N/D",
      d.nombre_producto || "N/D",
      d.proxima_aplicacion ? format(new Date(d.proxima_aplicacion), "dd/MM/yyyy", { locale: es }) : "N/D",
      "" // Espacio vacío para firma
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Fecha Aplicación", "Peso", "Producto", "Próxima Aplicación", "Firma Veterinario"]],
      body: desparasitacionesData,
      theme: "striped",
      headStyles: { 
        fillColor: [39, 174, 96],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center"
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        minCellHeight: 15
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { cellWidth: 35, halign: "center" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 50 },
        3: { cellWidth: 35, halign: "center" },
        4: { cellWidth: 40, halign: "center" } // Columna de firma
      },
      didDrawCell: (data) => {
        // Dibujar línea para firma en columna de firma
        if (data.column.index === 4 && data.cell.section === "body") {
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.2);
          const lineY = data.cell.y + data.cell.height - 3;
          doc.line(data.cell.x + 5, lineY, data.cell.x + data.cell.width - 5, lineY);
        }
      },
      margin: { left: 15, right: 15 }
    });

    // ============= FOOTER =============
    const finalY = doc.lastAutoTable.finalY || currentY;
    
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("VIDAPETS - Cuidando la salud de tu mascota", pageWidth / 2, pageHeight - 15, { align: "center" });
    doc.text(`Fecha de emisión: ${format(new Date(), "dd/MM/yyyy", { locale: es })}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    // ============= GUARDAR PDF =============
    doc.save(`Cartilla_${seleccionada.nombre}_${format(new Date(), "ddMMyyyy", { locale: es })}.pdf`);
    setErrors({ success: "✅ PDF generado correctamente." });
  } catch (err) {
    console.error("Error generando PDF:", err);
    setErrors({ general: "❌ Error al generar PDF: " + (err.message || err) });
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
                {m.nombre} {m.propietario.nombre && <small>({m.propietario.nombre})</small>}
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
              {seleccionada?.propietario.nombre && (
                <span className="text-dark"> ({seleccionada?.propietario.nombre})</span>
              )}
            </h5>
            <div className="text-center mb-4">
              <Button
                variant="primary"
                onClick={handleImprimirCartilla}
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
                <i className="bi bi-printer-fill me-2"></i> Imprimir Cartilla
              </Button>
            </div>

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
                          <td colSpan={5} className="text-center text-muted">
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
                          <td colSpan={5} className="text-center text-muted">
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
                    <Form.Label className="fw-bold">Subir etiqueta de la vacuna</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="bg-white text-dark border-secondary"
                    />
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
                    <Form.Label className="fw-bold">Subir etiqueta de la vacuna (reemplaza la actual si se selecciona)</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="bg-white text-dark border-secondary"
                    />
                    {formulario.datos.etiqueta_vacuna && (
                      <div className="mt-2">
                        <p className="text-muted">Imagen actual:</p>
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