import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  User,
  Mail,
  Lock,
  Bell,
  Database,
  Download,
  Upload,
  Trash2,
  Save,
} from "lucide-react";
import { useForm } from "react-hook-form";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ProfileForm {
  full_name: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function Settings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>();
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>();

  const watchNewPassword = watch("newPassword");

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error) throw error;

      setProfile(data);
      resetProfile({
        full_name: data.full_name || "",
        email: data.email,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("users")
        .update({
          full_name: data.full_name,
          email: data.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);

      if (error) throw error;

      // Update auth email if changed
      if (data.email !== profile?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (authError) throw authError;
      }

      await loadProfile();
      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      resetPassword();
      alert("Senha alterada com sucesso!");
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      // Get all user data
      const [accounts, categories, transactions, budgets] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user!.id),
        supabase.from("categories").select("*").eq("user_id", user!.id),
        supabase.from("transactions").select("*").eq("user_id", user!.id),
        supabase.from("budgets").select("*").eq("user_id", user!.id),
      ]);

      const exportData = {
        profile: profile,
        accounts: accounts.data,
        categories: categories.data,
        transactions: transactions.data,
        budgets: budgets.data,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-financeiro-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Erro ao exportar dados");
    }
  };

  const deleteAccount = async () => {
    const confirmation = prompt(
      'Para confirmar a exclusão da conta, digite "EXCLUIR" (em maiúsculas):',
    );

    if (confirmation !== "EXCLUIR") {
      alert("Confirmação incorreta. Conta não foi excluída.");
      return;
    }

    try {
      // Delete user data (cascade will handle related records)
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", user!.id);

      if (error) throw error;

      // Sign out user
      await signOut();
      alert("Conta excluída com sucesso");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Erro ao excluir conta");
    }
  };

  const tabs = [
    { id: "profile", name: "Perfil", icon: User },
    { id: "security", name: "Segurança", icon: Lock },
    { id: "integrations", name: "Integrações", icon: Bell },
    { id: "data", name: "Dados", icon: Database },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Gerencie sua conta e preferências</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Informações do Perfil
              </h2>

              <form
                onSubmit={handleProfileSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    {...registerProfile("full_name")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    {...registerProfile("email", {
                      required: "Email é obrigatório",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Email inválido",
                      },
                    })}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@email.com"
                  />
                  {profileErrors.email && (
                    <p className="text-red-600 text-sm mt-1">
                      {profileErrors.email.message}
                    </p>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Segurança
              </h2>

              <form
                onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    {...registerPassword("newPassword", {
                      required: "Nova senha é obrigatória",
                      minLength: {
                        value: 6,
                        message: "Senha deve ter pelo menos 6 caracteres",
                      },
                    })}
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-red-600 text-sm mt-1">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    {...registerPassword("confirmPassword", {
                      required: "Confirmação de senha é obrigatória",
                      validate: (value) =>
                        value === watchNewPassword || "Senhas não coincidem",
                    })}
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-red-600 text-sm mt-1">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{saving ? "Alterando..." : "Alterar Senha"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              {/* Google Calendar Integration */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Google Calendar
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Sincronize suas sessões com o Google Calendar
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Como configurar:
                    </h3>
                    <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                      <li>Acesse o Google Cloud Console</li>
                      <li>Crie um novo projeto ou selecione um existente</li>
                      <li>Ative a Google Calendar API</li>
                      <li>Configure as credenciais OAuth 2.0</li>
                      <li>Adicione as variáveis de ambiente no projeto</li>
                    </ol>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Variáveis necessárias:</strong>
                      <br />
                      • GOOGLE_CLIENT_ID
                      <br />
                      • GOOGLE_CLIENT_SECRET
                      <br />• GOOGLE_REDIRECT_URI
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      window.open("https://console.cloud.google.com/", "_blank")
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <span>Abrir Google Cloud Console</span>
                  </button>
                </div>
              </div>

              {/* Other Integrations */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Outras Integrações
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        WhatsApp Business
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Envie lembretes automáticos por WhatsApp
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">Em breve</span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Zoom</h3>
                      <p className="text-gray-600 text-sm">
                        Crie salas automáticas para sessões online
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">Em breve</span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Stripe</h3>
                      <p className="text-gray-600 text-sm">
                        Processe pagamentos online automaticamente
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">Em breve</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-6">
              {/* Export Data */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Exportar Dados
                </h2>
                <p className="text-gray-600 mb-4">
                  Faça o download de todos os seus dados financeiros em formato
                  JSON.
                </p>
                <button
                  onClick={exportData}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Dados</span>
                </button>
              </div>

              {/* Delete Account */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
                <h2 className="text-xl font-semibold text-red-900 mb-4">
                  Zona de Perigo
                </h2>
                <p className="text-gray-600 mb-4">
                  A exclusão da conta é permanente e não pode ser desfeita.
                  Todos os seus dados serão perdidos.
                </p>
                <button
                  onClick={deleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Conta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
