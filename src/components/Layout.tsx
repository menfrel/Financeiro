import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowUpDown, 
  PieChart, 
  Target, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
}

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { name: 'Contas', icon: CreditCard, key: 'accounts' },
  { name: 'Lançamentos', icon: ArrowUpDown, key: 'transactions' },
  { name: 'Categorias', icon: PieChart, key: 'categories' },
  { name: 'Orçamentos', icon: Target, key: 'budgets' },
  { name: 'Relatórios', icon: FileText, key: 'reports' },
  { name: 'Configurações', icon: Settings, key: 'settings' },
]

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-semibold text-gray-900">FinanceApp</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      onPageChange(item.key)
                      setSidebarOpen(false)
                    }}
                    className={`${
                      currentPage === item.key
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                  >
                    <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">FinanceApp</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onPageChange(item.key)}
                  className={`${
                    currentPage === item.key
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-lg font-semibold text-gray-900">FinanceApp</span>
            <div className="w-8" />
          </div>
        </div>
        <main className="flex-1 pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}