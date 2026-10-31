import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../lib/shadcn/dialog'
import { ScrollArea } from '../../lib/shadcn/scroll-area'
import type { Chapter } from '../../game/lore'
import reportText from '../../notes/forum-report.txt?raw'

export const goldButton =
  'font-forum tracking-[0.25em] text-base h-11 px-6 rounded-none border border-[#926223] bg-transparent text-[#DBD2C1] hover:bg-[#926223] hover:text-[#080808] transition-all hover:shadow-[0_0_24px_rgba(200,150,74,0.45)]'

export const grayButton =
  'font-forum tracking-[0.25em] text-base h-11 px-6 rounded-none border border-[#5f6360] bg-transparent text-[#A0A09F] hover:bg-[#5f6360] hover:text-[#080808] transition-colors'

function downloadReport() {
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'forum-report.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-play inline-flex items-center gap-2 text-sm text-[#A0A09F] hover:text-[#DBD2C1] transition-colors"
      >
        <FileText className="h-4 w-4" />
        Отчёт (.txt)
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Отчёт: форум и сайт</DialogTitle>
            <DialogDescription>Что удалось прочитать на 2112.forum2x2.ru и as-gard.com</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[55vh] rounded-md border p-4">
            <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">{reportText}</pre>
          </ScrollArea>
          <div className="flex justify-end">
            <Button onClick={downloadReport}>
              <Download className="h-4 w-4" />
              Скачать .txt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function IntroScreen({ hasProgress, onHome, onSleep }: { hasProgress: boolean; onHome: () => void; onSleep: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-12 text-center animate-in fade-in duration-1000">
      <h1 className="font-forum text-5xl text-[#DBD2C1] md:text-6xl">
        Возвращен<span className="text-[#926223] asgard-flicker">ϟ</span>е домой
      </h1>
      <p className="font-play text-lg font-bold text-[#E82020] asgard-flicker">
        Предупреждение!!! Первые абзацы покажутся безумием. Завершив чтение, безумным станет мир вокруг.
      </p>
      <div className="font-forum space-y-4 text-lg leading-relaxed text-[#DBD2C1]/90">
        <p>Во Вселенной нет случайностей, поэтому ты здесь.</p>
        <p>Видите ли, в чём дело, читая эти строки, вы спите. Перед погружением в сон мы договорились встретиться здесь — во Всемирной Паутине.</p>
        <p>Семь глав. Семь разных снов. Пробейте скорлупу, обведите бесконечность, разоблачите декорации, выберитесь из лабиринта, уплотните мысль, порвите паутину и упадите в кроличью нору.</p>
        <p className="text-[#C8964A]">Самое время выбирать: продолжать спать, либо очнуться и вернуться домой.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        <Button className={goldButton} onClick={onHome}>
          {hasProgress ? 'ПРОДОЛЖИТЬ' : 'ДОМОЙ'}
        </Button>
        <Button className={grayButton} onClick={onSleep}>
          СПАТЬ
        </Button>
      </div>
      <ReportButton />
    </div>
  )
}

export function SleepScreen({ onWake }: { onWake: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-24 text-center animate-in fade-in duration-1000">
      <p className="font-forum text-4xl text-[#5f6360] animate-pulse">z z z . . .</p>
      <p className="font-forum text-xl text-[#A0A09F]">
        Вы продолжаете спать. Во сне вы тоже уверены в его реальности, пока не зазвонит будильник.
      </p>
      <Button className={goldButton} onClick={onWake}>
        ПРОСНУТЬСЯ
      </Button>
    </div>
  )
}

export function ChapterScreen({
  index,
  chapter,
  daily,
  onStart,
  onBack,
}: {
  index: number
  chapter: Chapter
  daily: boolean
  onStart: () => void
  onBack: () => void
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-16 text-center animate-in fade-in zoom-in-95 duration-700">
      <p className="font-play text-sm uppercase tracking-[0.4em] text-[#926223]">
        Глава {index + 1} · {chapter.mechanic}
      </p>
      <h2 className="font-forum text-5xl text-[#DBD2C1]">{chapter.title}</h2>
      <p className="font-forum text-xl italic text-[#A0A09F]">«{chapter.epigraph}»</p>
      {daily && (
        <p className="font-play border border-[#C8964A]/60 px-3 py-1 text-xs uppercase tracking-widest text-[#C8964A]">
          Сон дня — очки x2
        </p>
      )}
      <ul className="font-play w-full space-y-2 border-y border-[#5f6360]/50 py-4 text-left text-sm text-[#DBD2C1]/90">
        {chapter.howTo.map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-[#926223]">ϟ</span>
            {h}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-center gap-4">
        <Button className={goldButton} onClick={onStart}>
          НАЧАТЬ
        </Button>
        <Button className={grayButton} onClick={onBack}>
          КАРТА
        </Button>
      </div>
    </div>
  )
}
