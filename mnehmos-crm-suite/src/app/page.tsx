import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-3xl text-center space-y-8">
        <header className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
            Mnehmos CRM Suite
          </h1>
          <p className="text-xl text-slate-300 md:text-2xl">
            Streamline Your Client Relationships & Boost Productivity.
          </p>
        </header>

        <section className="space-y-6">
          <p className="text-lg text-slate-400 leading-relaxed">
            Mnehmos CRM is designed to help you manage your customer interactions,
            track leads, and automate your sales pipeline with ease. Focus on
            what matters most: building strong, lasting relationships.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-3 text-lg font-semibold text-white bg-sky-500 rounded-lg shadow-md hover:bg-sky-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Get Started - Sign Up
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-3 text-lg font-semibold text-sky-400 bg-transparent border-2 border-sky-400 rounded-lg shadow-sm hover:bg-sky-400 hover:text-slate-900 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Already a User? Sign In
            </Link>
          </div>
        </section>

        {/* Optional Sections - Placeholder */}
        <section className="pt-12 space-y-10">
          <div>
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="p-6 bg-slate-800 rounded-lg shadow-lg">
                <h3 className="text-xl font-medium text-sky-300 mb-2">Contact Management</h3>
                <p className="text-slate-400">Keep all your client details organized and accessible.</p>
              </div>
              <div className="p-6 bg-slate-800 rounded-lg shadow-lg">
                <h3 className="text-xl font-medium text-sky-300 mb-2">Sales Pipeline</h3>
                <p className="text-slate-400">Visualize and manage your sales process effectively.</p>
              </div>
              <div className="p-6 bg-slate-800 rounded-lg shadow-lg">
                <h3 className="text-xl font-medium text-sky-300 mb-2">Task Automation</h3>
                <p className="text-slate-400">Automate repetitive tasks and save valuable time.</p>
              </div>
            </div>
          </div>

          {/* Placeholder for Pricing */}
          {/*
          <div>
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Pricing</h2>
            <p className="text-slate-400">Simple and transparent pricing plans. (Details coming soon)</p>
          </div>
          */}

          {/* Placeholder for Testimonials */}
          {/*
          <div>
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">What Our Users Say</h2>
            <div className="space-y-4">
              <blockquote className="p-4 bg-slate-800 rounded-lg shadow">
                <p className="text-slate-400 italic">"Mnehmos CRM has transformed how we manage our clients!" - Happy User</p>
              </blockquote>
              <blockquote className="p-4 bg-slate-800 rounded-lg shadow">
                <p className="text-slate-400 italic">"The best CRM I've used for my small business." - Another Satisfied Customer</p>
              </blockquote>
            </div>
          </div>
          */}
        </section>

        <footer className="pt-12">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Mnehmos Systems. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
