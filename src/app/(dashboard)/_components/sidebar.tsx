export function Sidebar({ user }) {
  return (
    <div className="flex flex-col w-64 h-screen px-4 py-8 bg-white border-r dark:bg-gray-800 dark:border-gray-600">
      <h2 className="text-3xl font-semibold text-gray-800 dark:text-white">Brand</h2>
      <div className="flex flex-col justify-between flex-1 mt-6">
        <nav>
          <a className="flex items-center px-4 py-2 text-gray-700 bg-gray-200 rounded-md dark:bg-gray-700 dark:text-white" href="#">
            <span className="mx-4 font-medium">Dashboard</span>
          </a>
        </nav>
      </div>
    </div>
  );
}
