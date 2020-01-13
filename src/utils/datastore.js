import path from 'path'
import Datastore from 'nedb'
import { remote } from 'electron'

export default new Datastore({
  filename: path.resolve(remote.app.getPath('userData'), './data.db'),
  autoload: true
})
