import { Award, Lock } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../lib/shadcn/tabs'
import type { Save } from '../../game/core/storage'
import { ACHIEVEMENTS, CHAPTERS, TOTAL_FRAGMENTS } from '../../game/lore'
import { goldButton } from './Screens'

export function CodexScreen({ save, onBack }: { save: Save; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-forum text-4xl text-[#DBD2C1]">Книга памяти</h2>
          <p className="font-play text-sm text-[#A0A09F]">
            Собрано {save.memories.length} из {TOTAL_FRAGMENTS} фрагментов. Каждое прохождение открывает новые.
          </p>
        </div>
        <Button className={goldButton} onClick={onBack}>
          КАРТА
        </Button>
      </div>
      <Tabs defaultValue="memory">
        <TabsList className="rounded-none bg-[#111] text-[#A0A09F]">
          <TabsTrigger value="memory" className="font-play rounded-none data-[state=active]:bg-[#926223] data-[state=active]:text-[#080808]">
            Память
          </TabsTrigger>
          <TabsTrigger value="ach" className="font-play rounded-none data-[state=active]:bg-[#926223] data-[state=active]:text-[#080808]">
            Озарения {save.achievements.length}/{ACHIEVEMENTS.length}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="memory" className="mt-4 space-y-6">
          {CHAPTERS.map((c, i) => {
            const got = c.fragments.filter((f) => save.memories.includes(f)).length
            return (
              <section key={c.id}>
                <h3 className="font-forum mb-2 flex items-baseline gap-3 text-2xl text-[#C8964A]">
                  {i + 1}. {c.title}
                  <span className="font-play text-xs text-[#A0A09F]">
                    {got}/{c.fragments.length}
                  </span>
                </h3>
                <ul className="space-y-1.5">
                  {c.fragments.map((f) =>
                    save.memories.includes(f) ? (
                      <li key={f} className="font-forum flex gap-2 text-[#DBD2C1]/90">
                        <span className="text-[#926223]">ϟ</span>
                        {f}
                      </li>
                    ) : (
                      <li key={f} className="font-play flex items-center gap-2 text-sm text-[#5f6360]">
                        <Lock className="h-3 w-3" />
                        <span className="select-none blur-[3px]">{f.replace(/[^\s]/g, '•')}</span>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )
          })}
        </TabsContent>
        <TabsContent value="ach" className="mt-4 grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const got = save.achievements.includes(a.id)
            return (
              <div key={a.id} className={`flex items-center gap-3 border px-4 py-3 ${got ? 'border-[#C8964A]/60 bg-[#926223]/10' : 'border-[#5f6360]/40'}`}>
                {got ? <Award className="h-6 w-6 text-[#C8964A]" /> : <Lock className="h-5 w-5 text-[#5f6360]" />}
                <div>
                  <p className={`font-forum text-lg ${got ? 'text-[#DBD2C1]' : 'text-[#A0A09F]'}`}>{a.title}</p>
                  <p className="font-play text-xs text-[#A0A09F]">{a.desc}</p>
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
