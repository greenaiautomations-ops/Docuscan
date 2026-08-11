import { Link } from 'react-router-dom'

export function UploadButton() {
  return (
    <Link
      to="/upload"
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
    >
      + Upload document
    </Link>
  )
}
