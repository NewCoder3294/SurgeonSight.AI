function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Tailwind CSS is Working! ✅
        </h1>
        <p className="text-gray-600 mb-6">
          This is a React + TypeScript + Vite project with Tailwind CSS v3.
        </p>
        <div className="space-y-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <p className="text-blue-800 font-semibold">Blue Card</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <p className="text-purple-800 font-semibold">Purple Card</p>
          </div>
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors font-semibold">
            Tailwind Button
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
