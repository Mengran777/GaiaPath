'use client'

import { useState } from 'react'

export default function SmartSearch() {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('User query:', query)
    // 👉 后续这里调用 GPT 接口
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow rounded-xl p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Smart Travel Search</h2>
      <p className="text-sm text-gray-500 mb-4">Type in a natural language query, like:</p>
      <p className="text-sm italic text-blue-600 mb-4">"5 days in Iceland for hiking and hot springs"</p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your travel idea..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
      >
        Generate Itinerary
      </button>
    </form>
  )
}
