import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  Tag,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useForm } from "react-hook-form";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  parent_id: string | null;
  created_at: string;
}

interface CategoryForm {
  name: string;
  type: "income" | "expense";
  color: string;
  parent_id?: string;
}

const colors = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
];

export function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryForm>();
  const watchType = watch("type");

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      setLoading(true);

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading categories:", error);
        throw error;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryForm) => {
    try {
      setSubmitting(true);

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error("Usuário não autenticado");
        return;
      }

      const categoryData = {
        user_id: user.id,
        name: data.name,
        type: data.type,
        color: data.color,
        parent_id: data.parent_id || null,
      };

      if (editingCategory) {
        // Garantir que só pode editar categorias do próprio usuário
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(categoryData);

        if (error) throw error;
      }

      await loadCategories();
      setIsModalOpen(false);
      setEditingCategory(null);
      reset();
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setValue("name", category.name);
    setValue("type", category.type);
    setValue("color", category.color);
    setValue("parent_id", category.parent_id || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;

    try {
      // Garantir que só pode deletar categorias do próprio usuário
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId)
        .eq("user_id", user!.id);

      if (error) throw error;
      await loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const openModal = () => {
    setEditingCategory(null);
    reset();
    setValue("color", colors[0]);
    setIsModalOpen(true);
  };

  const groupedCategories = categories.reduce(
    (acc, category) => {
      if (!acc[category.type]) {
        acc[category.type] = [];
      }
      acc[category.type].push(category);
      return acc;
    },
    {} as Record<string, Category[]>,
  );

  const parentCategories = categories.filter(
    (cat) => cat.parent_id === null && (!watchType || cat.type === watchType),
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600 mt-2">
            Organize suas receitas e despesas
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-gray-600 mb-6">
            Crie suas primeiras categorias para organizar seus lançamentos
          </p>
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Criar Categoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Income Categories */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Receitas</h2>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                {groupedCategories.income?.length || 0}
              </span>
            </div>

            <div className="space-y-3">
              {groupedCategories.income?.map((category) => (
                <div
                  key={category.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(!groupedCategories.income ||
                groupedCategories.income.length === 0) && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma categoria de receita encontrada
                </div>
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Despesas</h2>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                {groupedCategories.expense?.length || 0}
              </span>
            </div>

            <div className="space-y-3">
              {groupedCategories.expense?.map((category) => (
                <div
                  key={category.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(!groupedCategories.expense ||
                groupedCategories.expense.length === 0) && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma categoria de despesa encontrada
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Categoria
                </label>
                <input
                  {...register("name", { required: "Nome é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Alimentação, Salário, etc."
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  {...register("type", { required: "Tipo é obrigatório" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
                {errors.type && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria Pai (Opcional)
                </label>
                <select
                  {...register("parent_id")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhuma (categoria principal)</option>
                  {parentCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-9 gap-2">
                  {colors.map((color) => (
                    <label key={color} className="cursor-pointer">
                      <input
                        {...register("color", {
                          required: "Cor é obrigatória",
                        })}
                        type="radio"
                        value={color}
                        className="sr-only"
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    </label>
                  ))}
                </div>
                {errors.color && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.color.message}
                  </p>
                )}
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
                    : editingCategory
                      ? "Atualizar"
                      : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
