function Navbar() {
  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-green-600">
        NearBites
      </h1>

      <div className="space-x-4">
        <button className="text-gray-700 hover:text-green-600">
          Home
        </button>
        <button className="text-gray-700 hover:text-green-600">
          Cart
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded-lg">
          Login
        </button>
      </div>
    </nav>
  );
}

export default Navbar;