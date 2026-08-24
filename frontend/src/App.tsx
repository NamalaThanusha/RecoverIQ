import './index.css'

function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 text-white">
      <div className="max-w-2xl text-center p-8 border border-gray-700 rounded-xl shadow-2xl bg-gray-800">
        <h1 className="text-4xl font-bold mb-4 text-blue-400">RecoverIQ</h1>
        <p className="text-xl text-gray-300">
          AI-Powered Revenue Recovery Platform
        </p>
        <div className="mt-8 flex justify-center space-x-4">
          <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm">Status: Operational</span>
          <span className="px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-sm">Phase: 0</span>
        </div>
      </div>
    </div>
  )
}

export default App
