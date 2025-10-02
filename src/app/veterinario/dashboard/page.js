"use client";
import { useState, useEffect, useRef } from "react";
import Agenda from "./agenda";
import Consultorio from "./consultorio";
import Cartilla from "./cartilla";
import Solicitudes from "./solicitudes";
import PerfilMascota from "./perfilmascota";
import ServiciosMascota from "./ServiciosMascota";
import LlamadasEmergencia from "./LlamadasEmergencia";
import {
  Container,
  Nav,
  Dropdown,
  Image,
  Button,
  Modal,
  Alert,
  Spinner,
  Form,
} from "react-bootstrap";
import { FaBell, FaUserCircle, FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaSyncAlt } from "react-icons/fa";
import Cookies from "js-cookie";
import { io } from "socket.io-client";

export default function VeterinarioDashboard() {
  const [view, setView] = useState("agenda");
  const [user, setUser] = useState(null);
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState(null);

  // Estado para la llamada WebRTC
  const [incomingCall, setIncomingCall] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callerInfo, setCallerInfo] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [waitingForOffer, setWaitingForOffer] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [endCallForm, setEndCallForm] = useState({ precio: "50", motivo: "emergencia" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Refs para WebRTC y ringtone
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringtoneRef = useRef(null);

const RTC_CONFIG = {
  iceServers: [
    
    {
      urls: [
        "turn:50.17.103.219:3478",  // Nueva IP
        "turn:50.17.103.219:3478?transport=tcp",
      ],
      username: "webrtcuser",
      credential: "webrtcpass",
    },
  ],
};

  
  // Cargar usuario al montar
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error al cargar usuario:", error);
      }
    }
  }, []);

  // Conexión Socket.IO y manejo de llamadas
  useEffect(() => {
    if (!user) return;

    const socket = io("https://rtc-service.onrender.com", {
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Conectado al servidor de señalización");
      socket.emit("register", {
        userId: user.id || user._id,
        role: "veterinario",
      });
    });

    socket.on("incoming_call", ({ call, from }) => {
      console.log("📞 Llamada entrante de:", from);
      setIncomingCall({ from, callId: call.id });
      setCallerInfo({
        id: call.callerId,
        socketId: call.callerSocketId,
        motivo: call.motivo || "emergencia",
        cliente_nombre: call.cliente_nombre,
        cliente_telefono: call.cliente_telefono,
      });
      setCallStatus("ringing");
      setShowCallModal(true);
      // Reproducir ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.play().catch(err => console.error("Error al reproducir ringtone:", err));
      }
    });

    socket.on("webrtc_offer", ({ from, sdp }) => {
      console.log("📩 Oferta WebRTC recibida de:", from);
      setPendingOffer({ from, sdp });
      if (waitingForOffer && incomingCall?.from === from) {
        handleIncomingWebRTCCall(from, sdp);
        setWaitingForOffer(false);
        setPendingOffer(null);
      }
    });

    socket.on("webrtc_ice_candidate", ({ from, candidate }) => {
      if (pcRef.current && candidate && incomingCall?.from === from) {
        pcRef.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) => {
            console.error("Error al agregar ICE candidate:", err);
            setErrorMessage("Error en la conexión ICE. Intenta más tarde.");
          });
      }
    });

    socket.on("call_ended", () => {
      console.log("📞 Llamada finalizada por el cliente");
      setShowEndCallModal(false);
      finalizarLlamada();
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket desconectado");
      finalizarLlamada();
      setErrorMessage("Conexión perdida. Intenta reconectar.");
    });

    return () => {
      socket.disconnect();
      finalizarLlamada();
    };
  }, [user]);

  // Asigna streams a videos y activa audio
  useEffect(() => {
    const playVideo = async (videoRef, stream) => {
      if (videoRef.current && stream && stream.getTracks().length > 0) {
        if (!videoRef.current.srcObject) {
          videoRef.current.srcObject = stream;
        }
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Reproducción iniciada correctamente:", stream.getTracks().map((t) => t.kind));
            })
            .catch((error) => {
              console.error("Error al reproducir video:", error);
              if (error.name === "AbortError") {
                setTimeout(() => playVideo(videoRef, stream), 500); // Reintento después de 500ms
              }
            });
        }
      }
    };

    if (callAccepted && localVideoRef.current && localStreamRef.current) {
      playVideo(localVideoRef, localStreamRef.current);
    }
    if (callAccepted && remoteVideoRef.current && remoteStreamRef.current) {
      playVideo(remoteVideoRef, remoteStreamRef.current);
    }
  }, [callAccepted]);

  // Limpieza adicional al desmontar
  useEffect(() => {
    return () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (ringtoneRef.current) ringtoneRef.current.pause();
    };
  }, []);

  // Cargar cámaras disponibles (similar al user)
  const askAndLoadCameras = async () => {
    try {
      setLoadingDevices(true);
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoInputs);
      if (!selectedCameraId && videoInputs[0]) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
      if (tmp) tmp.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error("No se pudo obtener dispositivos de video:", err);
      setCameras([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  // Función para cambiar cámara durante la llamada
  const switchCamera = async (newCameraId) => {
    if (!localStreamRef.current) return;
    try {
      const newConstraints = {
        video: { deviceId: { exact: newCameraId } },
      };
      const newVideoTrack = await navigator.mediaDevices.getUserMedia(newConstraints).then(stream => stream.getVideoTracks()[0]);
      const sender = pcRef.current.getSenders().find(s => s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack);
      }
      // Actualizar stream local
      localStreamRef.current.getVideoTracks()[0].stop();
      localStreamRef.current.addTrack(newVideoTrack);
      setSelectedCameraId(newCameraId);
    } catch (err) {
      console.error("Error al cambiar cámara:", err);
      setErrorMessage("Error al cambiar la cámara. Intenta más tarde.");
    }
  };

  // Función para silenciar/apagar audio/video
  const toggleMute = (type) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach(track => {
      if (track.kind === type) {
        track.enabled = !track.enabled;
      }
    });
    if (type === 'audio') {
      setIsMuted(!isMuted);
    } else if (type === 'video') {
      setIsVideoOff(!isVideoOff);
    }
  };

  // Manejar llamada WebRTC entrante (agregar carga de cámaras)
  const handleIncomingWebRTCCall = async (from, offerSdp) => {
    try {
      setCallStatus("connecting");
      await askAndLoadCameras(); // Cargar cámaras al aceptar

      const constraints = {
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "user" }),
        },
      };

      const localStream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((err) => {
          console.error("Error al acceder a medios:", err);
          let msg = "Error desconocido. Intenta más tarde.";
          if (err.name === "NotAllowedError") {
            msg = "Permisos de micrófono o cámara denegados. Concede los permisos.";
          } else if (err.name === "NotFoundError") {
            msg = "No se encontraron dispositivos de audio o video.";
          } else {
            msg = "No se pudo acceder a los medios: " + err.message;
          }
          setErrorMessage(msg);
          throw err;
        });

      localStreamRef.current = localStream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("webrtc_ice_candidate", {
            to: from,
            from: user.id || user._id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
              remoteVideoRef.current
                .play()
                .catch((e) =>
                  console.error("Error inicial al reproducir video remoto:", e)
                );
            }
          }
          event.streams[0].getTracks().forEach((track) => {
            console.log("Añadiendo track remoto:", track.kind);
            if (!remoteStreamRef.current.getTracks().some((t) => t.id === track.id)) {
              remoteStreamRef.current.addTrack(track);
              if (remoteVideoRef.current && track.kind === "audio") {
                remoteVideoRef.current
                  .play()
                  .catch((e) => console.error("Error al reproducir audio:", e));
              }
            }
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          setCallStatus("error");
          setErrorMessage("Conexión perdida durante la llamada. Intenta reconectar.");
          socketRef.current.emit("finalizar_llamada", {
            veterinarioId: user.id || user._id,
            usuarioId: from,
          });
          finalizarLlamada();
        }
      };

      localStream.getTracks().forEach((track) => {
        console.log("Añadiendo track local:", track.kind);
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(answer);

      socketRef.current.emit("webrtc_answer", {
        to: from,
        from: user.id || user._id,
        sdp: pc.localDescription,
      });

      setCallAccepted(true);
      setCallStatus("connected");
      setShowCallModal(false);
    } catch (err) {
      console.error("❌ Error al aceptar llamada:", err);
      setCallStatus("error");
      setErrorMessage("Error al aceptar la llamada. Por favor, intenta de nuevo.");

      if (socketRef.current && incomingCall?.from) {
        socketRef.current.emit("rechazar_llamada", {
          veterinarioId: user.id || user._id,
          usuarioId: incomingCall.from,
          motivo: "Error técnico al conectar",
        });
      }

      finalizarLlamada();
    }
  };

  // Aceptar llamada manualmente
  const aceptarLlamada = () => {
    if (!incomingCall) return;
    setCallStatus("connecting");

    socketRef.current.emit("aceptar_llamada", {
      veterinarioId: user.id || user._id,
      usuarioId: incomingCall.from,
    });

    if (pendingOffer && pendingOffer.from === incomingCall.from) {
      handleIncomingWebRTCCall(pendingOffer.from, pendingOffer.sdp);
      setPendingOffer(null);
    } else {
      setWaitingForOffer(true);
      console.log("Esperando oferta WebRTC...");
    }
    // Detener ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  // Rechazar llamada
  const rechazarLlamada = () => {
    if (!incomingCall) return;

    if (socketRef.current) {
      socketRef.current.emit("rechazar_llamada", {
        veterinarioId: user.id || user._id,
        usuarioId: incomingCall.from,
        motivo: "El veterinario no está disponible",
      });
    }

    setWaitingForOffer(false);
    finalizarLlamada();
    setShowCallModal(false);
    // Detener ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  // Mostrar modal para finalizar llamada
  const handleEndCall = () => {
    setShowEndCallModal(true);
  };

  // Confirmar finalización de llamada con precio y motivo
  const confirmarFinalizarLlamada = () => {
    if (!incomingCall) return;

    console.log('Finalizando llamada con:', callerInfo, endCallForm);

    socketRef.current.emit("finalizar_llamada", {
      veterinarioId: user.id || user._id,
      usuarioId: incomingCall.from,
      extra: {
        precio: parseFloat(endCallForm.precio) || 50,
        motivo: endCallForm.motivo || "emergencia",
        cliente_nombre: callerInfo?.cliente_nombre || null,
        cliente_telefono: callerInfo?.cliente_telefono || null,
      },
    });

    setShowEndCallModal(false);
    finalizarLlamada();
  };

  // Finalizar llamada
  const finalizarLlamada = () => {
    if (callAccepted && socketRef.current && incomingCall?.from) {
      socketRef.current.emit("finalizar_llamada", {
        veterinarioId: user.id || user._id,
        usuarioId: incomingCall.from,
      });
    }

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        sender.track?.stop();
      });
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallAccepted(false);
    setIncomingCall(null);
    setPendingOffer(null);
    setCallStatus("");
    setCallerInfo(null);
    setShowCallModal(false);
    setWaitingForOffer(false);
    setEndCallForm({ precio: "50", motivo: "emergencia" });
    setIsMuted(false);
    setIsVideoOff(false);
    setCameras([]);
    setSelectedCameraId("");
    setErrorMessage("");
  };

  // Cerrar sesión
  const logout = () => {
    finalizarLlamada();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    Cookies.remove("token");
    window.location.href = "/login";
  };

  return (
    <Container fluid className="p-0" style={{
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1), 0 0 32px rgba(0, 128, 255, 0.1)',
      transition: 'box-shadow 0.3s ease-in-out',
      backgroundColor: '#ffffff',
    }}>
      {/* Audio para ringtone */}
      <audio ref={ringtoneRef} loop>
        <source src="https://www.soundjay.com/phone/telephone-ring-3.mp3" type="audio/mpeg" />
        {/* Puedes cambiar este URL por otro personalizado editando el código */}
      </audio>

      {/* Encabezado superior */}
      <div
        className="d-flex justify-content-between align-items-center text-dark px-4 py-3"
        style={{ 
          backgroundColor: "#ffffff",
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
          transition: 'box-shadow 0.3s ease-in-out',
        }}
      >
        <div className="d-flex align-items-center">
          <img
            src="https://i.postimg.cc/13XLcjyv/imagen-2025-09-30-163600354.png"
            alt="Veterinaria Vidapets"
            style={{ height: "40px" }}
          />
        </div>

        <div className="d-flex align-items-center gap-4">
          <Dropdown align="end">
            <Dropdown.Toggle variant="light" id="dropdown-notificaciones" className="border-0 p-0">
              <FaBell size={24} className="text-dark" />
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-3" style={{ minWidth: "300px", fontSize: "1rem" }}>
              <Dropdown.Header>Notificaciones</Dropdown.Header>
              <div className="text-muted text-center py-2">No hay notificaciones</div>
            </Dropdown.Menu>
          </Dropdown>

          <Button variant="light" className="border-0 p-0" onClick={logout}>
            {user?.imagen ? (
              <Image
                src={user.imagen}
                roundedCircle
                width={32}
                height={32}
                alt="Avatar"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <FaUserCircle size={26} className="text-dark" />
            )}
            <span className="ms-2 text-dark">{user?.nombre || "Usuario"} - Salir</span>
          </Button>
        </div>
      </div>

      {/* Barra de navegación */}
      <Nav
        className="px-4 py-0 d-flex align-items-center gap-3"
        style={{ 
          backgroundColor: "#f8f9fa",
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
          transition: 'box-shadow 0.3s ease-in-out',
        }}
      >
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("agenda")}
            className="fw-semibold text-dark px-5 py-3 rounded-1"
            style={{ 
              backgroundColor: "#ffffff", 
              marginTop: "20px",
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
              transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Agenda
          </Nav.Link>
        </Nav.Item>
        <Dropdown as={Nav.Item}>
          <Dropdown.Toggle
            as={Nav.Link}
            className="fw-semibold text-dark px-5 py-3 rounded-1"
            style={{ 
              backgroundColor: "#ffffff", 
              cursor: "pointer", 
              marginTop: "20px",
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
              transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Consultorio
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setView("consultorio")}>Consultorio</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("cartilla")}
            className="fw-semibold text-dark px-5 py-3 rounded-1"
            style={{ 
              backgroundColor: "#ffffff", 
              marginTop: "20px",
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
              transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Cartilla
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("solicitudes")}
            className="fw-semibold text-dark px-5 py-3 rounded-1"
            style={{ 
              backgroundColor: "#ffffff", 
              marginTop: "20px",
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
              transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Solicitudes
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            onClick={() => setView("llamadasEmergencia")}
            className="fw-semibold text-dark px-5 py-3 rounded-1"
            style={{ 
              backgroundColor: "#ffffff", 
              marginTop: "20px",
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)',
              transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 128, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Llamadas de Emergencia
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Contenido principal */}
      <div className="p-4" style={{ 
        backgroundColor: "#ffffff", 
        minHeight: "100vh",
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)',
        transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
        borderRadius: '8px',
      }}>
        {errorMessage && (
          <Alert variant="danger" onClose={() => setErrorMessage("")} dismissible>
            {errorMessage}
          </Alert>
        )}
        {view === "agenda" && <Agenda />}
        {view === "consultorio" && (
          <Consultorio
            setView={setView}
            setMascotaSeleccionada={setMascotaSeleccionada}
            setPropietarioSeleccionado={setPropietarioSeleccionado}
          />
        )}
        {view === "cartilla" && <Cartilla />}
        {view === "solicitudes" && <Solicitudes />}
        {view === "perfilMascota" && mascotaSeleccionada && propietarioSeleccionado && (
          <PerfilMascota
            mascota={mascotaSeleccionada}
            propietario={propietarioSeleccionado}
            setView={setView}
          />
        )}
        {view === "servicios" && (
          <ServiciosMascota
            setView={(v) => {
              const mascota = JSON.parse(localStorage.getItem("mascota_servicio"));
              const propietario = JSON.parse(localStorage.getItem("propietario_servicio"));
              setMascotaSeleccionada(mascota);
              setPropietarioSeleccionado(propietario);
              setView(v);
            }}
          />
        )}
        {view === "llamadasEmergencia" && <LlamadasEmergencia veterinarioId={user?.id || user?._id} />}
      </div>

      {/* Modal de llamada entrante */}
      <Modal show={showCallModal && !callAccepted} onHide={rechazarLlamada} centered style={{
        boxShadow: '0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)',
        borderRadius: '16px',
        transition: 'transform 0.3s ease-in-out',
      }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
        <Modal.Header closeButton>
          <Modal.Title>📞 Llamada entrante</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <p>Cliente está llamando...</p>
            {callerInfo?.cliente_nombre && <p>Cliente: {callerInfo.cliente_nombre}</p>}
            {callerInfo?.cliente_telefono && <p>Teléfono: {callerInfo.cliente_telefono}</p>}
            {callerInfo?.motivo && <p>Motivo: {callerInfo.motivo}</p>}
          </Alert>

          {callStatus === "connecting" && (
            <div className="text-center my-3">
              <Spinner animation="border" variant="primary" />
              <p>Conectando...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={rechazarLlamada}>
            <FaPhoneSlash className="me-2" /> Rechazar
          </Button>
          <Button variant="success" onClick={aceptarLlamada} disabled={callStatus === "connecting"}>
            {callStatus === "connecting" ? (
              <>
                <Spinner animation="border" size="sm" /> Conectando...
              </>
            ) : (
              <>
                <FaPhone className="me-2" /> Aceptar
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Vista durante la llamada */}
      {callAccepted && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255,255,255,0.9)",
            zIndex: 1050,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "20px",
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08), 0 0 24px rgba(0, 128, 255, 0.05)',
            }}
          >
            <h6
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                color: "black",
                zIndex: 1,
                backgroundColor: "rgba(255,255,255,0.5)",
                padding: "5px 10px",
                borderRadius: "4px",
              }}
            >
              Cliente
            </h6>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Controles de llamada */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "20px",
              zIndex: 20,
            }}>
              <Button variant={isMuted ? "danger" : "secondary"} onClick={() => toggleMute('audio')}>
                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </Button>
              <Button variant={isVideoOff ? "danger" : "secondary"} onClick={() => toggleMute('video')}>
                {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
              </Button>
              <Button variant="secondary" onClick={() => switchCamera(selectedCameraId === cameras[0]?.deviceId ? cameras[1]?.deviceId : cameras[0]?.deviceId)}>
                <FaSyncAlt />
              </Button>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "80px",
              right: "20px",
              width: "150px",
              height: "200px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              overflow: "hidden",
              border: "2px solid #dee2e6",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          >
            <h6
              style={{
                position: "absolute",
                top: "5px",
                left: "5px",
                color: "black",
                zIndex: 1,
                fontSize: "12px",
                backgroundColor: "rgba(255,255,255,0.5)",
                padding: "2px 5px",
                borderRadius: "4px",
              }}
            >
              Tú
            </h6>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <Button
              variant="danger"
              size="lg"
              onClick={handleEndCall}
              style={{
                borderRadius: "50%",
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaPhoneSlash size={20} />
            </Button>
          </div>

          {/* Modal para finalizar llamada con precio y motivo */}
          <Modal show={showEndCallModal} onHide={() => setShowEndCallModal(false)} centered style={{
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.15), 0 0 48px rgba(0, 128, 255, 0.1)',
            borderRadius: '16px',
            transition: 'transform 0.3s ease-in-out',
          }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <Modal.Header closeButton>
              <Modal.Title>Finalizar Llamada de Emergencia</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Precio ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={endCallForm.precio}
                    onChange={(e) => setEndCallForm({ ...endCallForm, precio: e.target.value })}
                    placeholder="Ingrese el precio de la consulta"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Motivo</Form.Label>
                  <Form.Control
                    type="text"
                    value={endCallForm.motivo}
                    onChange={(e) => setEndCallForm({ ...endCallForm, motivo: e.target.value })}
                    placeholder="Motivo de la llamada"
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEndCallModal(false)}>
                Cancelar
              </Button>
              <Button variant="success" onClick={confirmarFinalizarLlamada}>
                Confirmar
              </Button>
            </Modal.Footer>
          </Modal>

        </div>
      )}
    </Container>
  );
}