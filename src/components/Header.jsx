export default function Header() {
  return (
    <header className="flex items-center justify-between bg-black text-white px-4 py-2 shadow-md">
      {/* 로고 */}
      <h1 className="text-2xl font-semibold tracking-tight">CaloCheck</h1>

      {/* 메뉴 */}
      <nav className="flex gap-6 text-sm font-medium">
        <a href="#" className="hover:text-gray-300 transition-colors">
          Home
        </a>
        <a href="#" className="hover:text-gray-300 transition-colors">
          Brands
        </a>
        <a href="#" className="hover:text-gray-300 transition-colors">
          Stores
        </a>
      </nav>

      {/* 우측 액션 */}
      <button className="bg-white text-black px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors">
        Login
      </button>
    </header>
  );
}
