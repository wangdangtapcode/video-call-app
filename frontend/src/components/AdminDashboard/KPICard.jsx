export default function KPICard({ title, value, color }) {
  return (
    <div
      className={`
        bg-white shadow-lg rounded-2xl p-6 
        flex flex-col items-center justify-center 
        transition-transform duration-300 hover:scale-105 hover:shadow-xl
      `}
    >
      <h3 className="text-gray-500 text-sm uppercase tracking-wide mb-2">
        {title}
      </h3>
      <span
        className={`text-4xl font-extrabold ${color} drop-shadow-md`}
      >
        {value}
      </span>
      <div
        className={`mt-3 h-1 w-12 rounded-full ${color} opacity-70`}
      ></div>
    </div>
  );
}
