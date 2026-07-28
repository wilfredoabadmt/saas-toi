export function Header({ user, organization }: { user: any, organization: any }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center">
        <button className="text-gray-500 focus:outline-none lg:hidden">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H20M4 18H11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <button className="relative block w-8 h-8 overflow-hidden rounded-full shadow focus:outline-none">
            <img className="object-cover w-full h-full" src={user.image} alt="Your avatar" />
          </button>
        </div>
      </div>
    </header>
  );
}
