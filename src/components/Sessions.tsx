import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  FileText,
  Target,
  BookOpen,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserX,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format, parse, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Session, SessionForm, Patient } from "../types/patients";
import { googleCalendarService } from "../lib/googleCalendar";

export function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [patientFilter, setPatientFilter] = useState<string>("");
  const [isCalendarConfigOpen, setIsCalendarConfigOpen] = useState(false);
  const [calendarIntegrationEnabled, setCalendarIntegrationEnabled] =
    useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SessionForm>();

  const watchSessionDate = watch("session_date");
  const watchDuration = watch("duration_minutes");

  useEffect(() => {
    if (user) {
      loadData();
      checkCalendarIntegration();
    }
  }, [user]);

  const checkCalendarIntegration = () => {
    // Check if Google Calendar is configured
    const isConfigured = googleCalendarService.isConfigured();
    setCalendarIntegrationEnabled(isConfigured);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Carregar pacientes
      const { data: patientsData } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      // Carregar sessões com dados do paciente
      // Primeiro carregar as sessões
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false });

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
        setSessions([]);
      } else {
        console.log("Raw sessions data:", sessionsData);
        
        // Depois carregar os dados dos pacientes e fazer o merge manual
        if (sessionsData && sessionsData.length > 0) {
          const patientIds = [...new Set(sessionsData.map(s => s.patient_id))];
          const { data: patientsForSessions } = await supabase
            .from("patients")
            .select("id, name, email, phone")
            .in("id", patientIds);

          // Fazer merge manual dos dados
          const sessionsWithPatients = sessionsData.map(session => ({
            ...session,
            patient: patientsForSessions?.find(p => p.id === session.patient_id) || null
          }));

          console.log("Sessions with patients:", sessionsWithPatients);
          setSessions(sessionsWithPatients);
        } else {
          setSessions([]);
        }
      }

      console.log("Patients loaded:", patientsData?.length || 0);

      setPatients(patientsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      setSessions([]);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SessionForm) => {
    try {
      setSubmitting(true);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      const sessionData = {
        user_id: user.id,
        patient_id: data.patient_id,
        session_date: data.session_date,
        duration_minutes: data.duration_minutes,
        session_type: data.session_type,
        notes: data.notes || null,
        objectives: data.objectives || null,
        homework: data.homework || null,
        next_session_date: data.next_session_date || null,
        status: data.status,
      };

      if (editingSession) {
        const { error } = await supabase
          .from("sessions")
          .update(sessionData)
          .eq("id", editingSession.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("sessions").insert(sessionData);

        if (error) throw error;
      }

      await loadData();

      // Sync with Google Calendar if enabled
      if (calendarIntegrationEnabled && !editingSession) {
        try {
          const patient = patients.find((p) => p.id === data.patient_id);
          if (patient) {
            const calendarEvent = googleCalendarService.sessionToCalendarEvent({
              patient_name: patient.name,
              session_date: data.session_date,
              duration_minutes: data.duration_minutes,
              session_type: data.session_type,
              notes: data.notes,
              patient_email: patient.email,
            });

            await googleCalendarService.createEvent(calendarEvent);
            console.log("Sessão sincronizada com Google Calendar");
          }
        } catch (error) {
          console.error("Erro ao sincronizar com Google Calendar:", error);
          // Don't block the session creation if calendar sync fails
        }
      }

      setIsModalOpen(false);
      setEditingSession(null);
      reset();
    } catch (error) {
      console.error("Error saving session:", error);
      alert("Erro ao salvar sessão");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setValue("patient_id", session.patient_id);
    setValue("session_date", session.session_date);
    setValue("duration_minutes", session.duration_minutes);
    setValue("session_type", session.session_type);
    setValue("notes", session.notes || "");
    setValue("objectives", session.objectives || "");
    setValue("homework", session.homework || "");
    setValue("next_session_date", session.next_session_date || "");
    setValue("status", session.status);
    setIsModalOpen(true);
  };

  const handleView = (session: Session) => {
    setViewingSession(session);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (sessionId: string) => {
    if (
      !confirm(
        "Deseja realmente excluir esta sessão? Esta ação não pode ser desfeita.",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user!.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Erro ao excluir sessão");
    }
  };

  const handleStatusChange = async (
    sessionId: string,
    newStatus: Session["status"],
  ) => {
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ status: newStatus })
        .eq("id", sessionId)
        .eq("user_id", user!.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error updating session status:", error);
      alert("Erro ao atualizar status da sessão");
    }
  };

  const openModal = () => {
    setEditingSession(null);
    reset();
    setValue("duration_minutes", 50);
    setValue("session_type", "individual");
    setValue("status", "scheduled");
    setValue("session_date", format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setIsModalOpen(true);
  };

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: Session["status"]) => {
    switch (status) {
      case "scheduled":
        return "Agendada";
      case "completed":
        return "Concluída";
      case "cancelled":
        return "Cancelada";
      case "no_show":
        return "Faltou";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: Session["status"]) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "no_show":
        return <UserX className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    try {
      // Parse the datetime-local input correctly
      const start = new Date(startTime + (startTime.includes('T') ? '' : 'T00:00:00'));
      const end = addMinutes(start, duration);
      return format(end, "HH:mm");
    } catch {
      return "";
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      (session.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.notes &&
        session.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.objectives &&
        session.objectives.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || session.status === statusFilter;
    const matchesPatient =
      !patientFilter || session.patient_id === patientFilter;
    return matchesSearch && matchesStatus && matchesPatient;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sessões</h1>
          <p className="text-gray-600 mt-2">
            Gerencie o histórico de sessões dos seus pacientes
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setIsCalendarConfigOpen(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            title="Configurar Google Calendar"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* Status da Integração e Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        {calendarIntegrationEnabled && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Google Calendar integrado
              </span>
              <ExternalLink className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-green-700 text-sm mt-1">
              Novas sessões serão automaticamente sincronizadas com seu
              calendário.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar sessões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os pacientes</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="scheduled">Agendada</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">Faltou</option>
          </select>
        </div>
      </div>

      {/* Lista de Sessões */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter || patientFilter
              ? "Nenhuma sessão encontrada"
              : "Nenhuma sessão agendada"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter || patientFilter
              ? "Tente ajustar os filtros de busca"
              : "Agende sua primeira sessão para começar"}
          </p>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Agendar Sessão
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const sessionDate = new Date(session.session_date);
            const endTime = calculateEndTime(
              session.session_date,
              session.duration_minutes,
            );

            return (
              <div
                key={session.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      {getStatusIcon(session.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {session.patient?.name || 'Paciente não encontrado'}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}
                        >
                          {getStatusLabel(session.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(sessionDate, "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(sessionDate, "HH:mm", { locale: ptBR })} - {endTime} (
                            {session.duration_minutes}min)
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span className="capitalize">
                            {session.session_type}
                          </span>
                        </div>
                      </div>

                      {session.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {session.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleView(session)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(session)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                  {session.status === "scheduled" && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusChange(session.id, "completed")
                        }
                        className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Concluir</span>
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(session.id, "cancelled")
                        }
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancelar</span>
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(session.id, "no_show")
                        }
                        className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Faltou</span>
                      </button>
                    </>
                  )}
                  {session.status !== "scheduled" && (
                    <button
                      onClick={() =>
                        handleStatusChange(session.id, "scheduled")
                      }
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Reagendar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingSession ? "Editar Sessão" : "Nova Sessão"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paciente *
                  </label>
                  <select
                    {...register("patient_id", {
                      required: "Paciente é obrigatório",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                  {errors.patient_id && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.patient_id.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data e Hora *
                  </label>
                  <input
                    {...register("session_date", {
                      required: "Data e hora são obrigatórias",
                    })}
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.session_date && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.session_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (minutos) *
                  </label>
                  <input
                    {...register("duration_minutes", {
                      required: "Duração é obrigatória",
                      valueAsNumber: true,
                      min: {
                        value: 1,
                        message: "Duração deve ser maior que zero",
                      },
                    })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.duration_minutes && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.duration_minutes.message}
                    </p>
                  )}
                  {watchSessionDate && watchDuration && (
                    <p className="text-sm text-gray-500 mt-1">
                      Término:{" "}
                      {calculateEndTime(watchSessionDate, watchDuration)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Sessão
                  </label>
                  <select
                    {...register("session_type")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="group">Grupo</option>
                    <option value="family">Familiar</option>
                    <option value="couple">Casal</option>
                    <option value="evaluation">Avaliação</option>
                    <option value="follow_up">Acompanhamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">Agendada</option>
                    <option value="completed">Concluída</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">Faltou</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Próxima Sessão
                  </label>
                  <input
                    {...register("next_session_date")}
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objetivos da Sessão
                  </label>
                  <textarea
                    {...register("objectives")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Objetivos e metas para esta sessão"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anotações da Sessão
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações, evolução, pontos importantes discutidos"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarefa de Casa
                  </label>
                  <textarea
                    {...register("homework")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Atividades ou exercícios para o paciente realizar"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? "Salvando..."
                    : editingSession
                      ? "Atualizar"
                      : "Agendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualização */}
      {isViewModalOpen && viewingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes da Sessão
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  {getStatusIcon(viewingSession.status)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {viewingSession.patient?.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingSession.status)}`}
                  >
                    {getStatusLabel(viewingSession.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Informações da Sessão
                  </h4>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {format(
                        new Date(viewingSession.session_date),
                        "dd/MM/yyyy HH:mm",
                        { locale: ptBR },
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {viewingSession.duration_minutes} minutos
                      {viewingSession.session_date && (
                        <span className="text-gray-500 ml-2">
                          (até{" "}
                          {calculateEndTime(
                            viewingSession.session_date,
                            viewingSession.duration_minutes,
                          )}
                          )
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700 capitalize">
                      {viewingSession.session_type}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Próxima Sessão
                  </h4>

                  {viewingSession.next_session_date ? (
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">
                        {format(
                          new Date(viewingSession.next_session_date),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR },
                        )}
                      </span>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Não agendada</p>
                  )}
                </div>
              </div>

              {viewingSession.objectives && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Objetivos</span>
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {viewingSession.objectives}
                    </p>
                  </div>
                </div>
              )}

              {viewingSession.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Anotações</span>
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {viewingSession.notes}
                    </p>
                  </div>
                </div>
              )}

              {viewingSession.homework && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Tarefa de Casa</span>
                  </h4>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {viewingSession.homework}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
                <p>
                  Criada em:{" "}
                  {format(
                    new Date(viewingSession.created_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )}
                </p>
                {viewingSession.updated_at !== viewingSession.created_at && (
                  <p>
                    Última atualização:{" "}
                    {format(
                      new Date(viewingSession.updated_at),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewingSession);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Editar Sessão
              </button>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuração Google Calendar */}
      {isCalendarConfigOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Integração Google Calendar
              </h2>
              <button
                onClick={() => setIsCalendarConfigOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <Calendar className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Conectar com Google Calendar
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  Sincronize automaticamente suas sessões com o Google Calendar.
                  Você e seus pacientes receberão lembretes automáticos.
                </p>
              </div>

              {!calendarIntegrationEnabled ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Benefícios:
                    </h4>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li>• Sincronização automática de sessões</li>
                      <li>• Lembretes por email para você e pacientes</li>
                      <li>• Visualização no seu calendário pessoal</li>
                      <li>• Evita conflitos de horários</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Nota:</strong> Para configurar a integração com
                      Google Calendar, você precisa configurar as credenciais
                      OAuth2 do Google nas configurações do projeto.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      alert(
                        "Para configurar a integração com Google Calendar, você precisa:\n\n1. Criar um projeto no Google Cloud Console\n2. Ativar a Calendar API\n3. Configurar OAuth2\n4. Adicionar as credenciais nas variáveis de ambiente\n\nConsulte a documentação para mais detalhes.",
                      );
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Configurar Integração</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Integração Ativa
                      </span>
                    </div>
                    <p className="text-green-800 text-sm">
                      Suas sessões estão sendo sincronizadas automaticamente com
                      o Google Calendar.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      // Disconnect Google Calendar
                      setCalendarIntegrationEnabled(false);
                      alert("Integração com Google Calendar desconectada.");
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsCalendarConfigOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
