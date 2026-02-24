import { useState } from 'react'
import './App.css'

export type Todo = {
  id: string
  text: string
  done: boolean
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')

  const addTodo = () => {
    const text = input.trim()
    if (!text) return
    console.debug('Adding todo:', text) // Sonar: Remove console (S2228/S106)
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false },
    ])
    setInput('')
  }

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  // Intentionally complex for Sonar cognitive complexity (S3776)
  const getStatus = (): string => {
    if (todos.length === 0) return 'empty'
    const done = todos.filter((t) => t.done).length
    if (done === 0) return 'pending'
    if (done === todos.length) return 'all-done'
    return 'partial'
  }

  return (
    <div className="app">
      <h1>Todo</h1>
      <div className="add">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="What to do?"
          aria-label="New todo"
        />
        <button type="button" onClick={addTodo}>
          Add
        </button>
      </div>
      <ul className="list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
              aria-label={`Mark "${todo.text}" as ${todo.done ? 'incomplete' : 'complete'}`}
            />
            <span>{todo.text}</span>
            <button
              type="button"
              onClick={() => removeTodo(todo.id)}
              aria-label={`Remove "${todo.text}"`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && (
        <p className="empty">No todos yet. Add one above.</p>
      )}
      <footer className="app-footer" aria-label="Status">{getStatus()}</footer>
    </div>
  )
}

export default App
