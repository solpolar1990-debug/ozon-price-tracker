export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          {/* Logo */}
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl">
              🛒
            </div>
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-400">
              Ozon Price Tracker
            </h1>
          </div>

          {/* Description */}
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
            Telegram-бот для отслеживания цен на товары Ozon.
            <br />
            Получайте уведомления при изменении цены на 10% и более.
          </p>

          {/* Bot Link */}
          <a
            href="https://t.me/ozonboto_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl text-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <span className="text-3xl">🤖</span>
            Открыть бота в Telegram
          </a>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-xl font-bold mb-2">Добавление по ссылке</h3>
              <p className="text-gray-400">Отправьте ссылку на товар Ozon, и бот начнёт отслеживать его цену</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📉</div>
              <h3 className="text-xl font-bold mb-2">Уведомления о скидках</h3>
              <p className="text-gray-400">Получайте уведомления когда цена изменяется на 10%+</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-bold mb-2">Автоматическая проверка</h3>
              <p className="text-gray-400">Цены проверяются 3 раза в день автоматически</p>
            </div>
          </div>

          {/* Commands */}
          <div className="mt-16 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">📋 Команды бота</h2>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <code className="bg-white/10 px-3 py-1 rounded-lg text-orange-400">/start</code>
                <span className="text-gray-300">Начать работу с ботом</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-white/10 px-3 py-1 rounded-lg text-orange-400">/add [ссылка]</code>
                <span className="text-gray-300">Добавить товар</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-white/10 px-3 py-1 rounded-lg text-orange-400">/list</code>
                <span className="text-gray-300">Список товаров</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-white/10 px-3 py-1 rounded-lg text-orange-400">/remove</code>
                <span className="text-gray-300">Удалить товар</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-white/10 px-3 py-1 rounded-lg text-orange-400">/help</code>
                <span className="text-gray-300">Справка</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500">
          <p>Ozon Price Tracker Bot • Powered by Vercel</p>
        </footer>
      </div>
    </main>
  )
}
