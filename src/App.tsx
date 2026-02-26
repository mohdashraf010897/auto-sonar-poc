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

  // Intentionally high cognitive complexity for Sonar S3776
  const getStatus = (): string => {
    if (todos.length === 0) return 'empty'
    const done = todos.filter((t) => t.done).length
    if (done === 0) return 'pending'
    if (done === todos.length) return 'all-done'
    if (done > 0 && done < todos.length) return 'partial'
    if (todos.some((t) => t.done) && todos.some((t) => !t.done)) return 'partial'
    return 'unknown'
  }

  // S134 — deep nesting (4+ levels) for Sonar demo
  const renderNested = () => {
    if (todos.length > 0) {
      if (todos.some((t) => t.done)) {
        if (todos.every((t) => t.done)) {
          if (input.length > 0) {
            return 'all-done-with-input'
          }
          return 'all-done'
        }
        return 'partial'
      }
      return 'pending'
    }
    return 'empty'
  }

  return (
    <div className="app" data-testid={renderNested()}>
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
