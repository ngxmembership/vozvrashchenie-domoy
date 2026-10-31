import type { BaseMode } from '../core/base'
import type { ModeOptions } from '../core/types'
import type { ModeId } from '../lore'
import { CirclesMode } from './circles'
import { MagicMode } from './magic'
import { MazeMode } from './maze'
import { RabbitMode } from './rabbit'
import { SceneryMode } from './scenery'
import { ShellMode } from './shell'
import { WebMode } from './web'

export function createMode(id: ModeId, opts: ModeOptions): BaseMode {
  switch (id) {
    case 'shell':
      return new ShellMode(opts)
    case 'circles':
      return new CirclesMode(opts)
    case 'scenery':
      return new SceneryMode(opts)
    case 'maze':
      return new MazeMode(opts)
    case 'magic':
      return new MagicMode(opts)
    case 'web':
      return new WebMode(opts)
    case 'rabbit':
      return new RabbitMode(opts)
  }
}

export { WebMode }
