// Array of image filenames located in public/branding
const brandingImages = [
  'branding_page_1.png',
  'branding_page_2.png',
  'branding_page_3.png',
  'branding_page_4.png',
];

export default function BrandingPage() {
  return (
    <section className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Branding Assets
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Lista de arquivos e manuais de branding do sistema disponíveis para download estático.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
        {brandingImages.map((filename) => (
          <div key={filename} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-mono text-slate-700 dark:text-slate-300">{filename}</span>
            <a
              href={`/branding/${filename}`}
              download
              className="text-indigo-600 hover:underline font-bold dark:text-indigo-400"
            >
              Baixar Arquivo
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
