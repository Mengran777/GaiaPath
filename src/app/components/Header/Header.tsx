'use client'

export default function Header() {
  return (
    <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <div className="text-2xl font-bold text-blue-600">
        GaiaPath 🌍
      </div>

      {/* Navigation menu */}
      <nav className="space-x-6 hidden md:block">
        <a href="#" className="text-gray-700 hover:text-blue-600">Discover</a>
        <a href="#" className="text-gray-700 hover:text-blue-600">My Trips</a>
        <a href="#" className="text-gray-700 hover:text-blue-600">Favorites</a>
      </nav>

      {/* User info */}
      <div className="flex items-center space-x-2">
        <img
          src="https://i.pravatar.cc/36?u=gaia"
          alt="User Avatar"
          className="w-9 h-9 rounded-full"
        />
        <span className="hidden sm:inline text-gray-700">Mengran</span>
      </div>
    </header>
  )
}
