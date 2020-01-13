import db from './datastore'

export const getDatabyKey = key => {
  return new Promise((resolve, reject) => {
    if (!key || key === '') reject(new Error('key is null'))
    db.findOne({ key }, (err, doc) => {
      if (err || err !== null) {
        reject(err)
      } else {
        resolve(doc)
      }
    })
  })
}

export const setDatabyKey = (key, val) => {
  return new Promise(async (resolve, reject) => {
    await getDatabyKey(key).then(data => {
      if (!data || data === null) {
        db.insert({ key, value: val }, (err, doc) => {
          if (err || err !== null) reject(err)
          else resolve(doc)
        })
      } else {
        db.update({ key }, { value: val }, {}, (err, numReplaced) => {
          if (err || err !== null) reject(err)
          else resolve(numReplaced)
        })
      }
    }).catch(err => {
      console.log(err)
    })
  })
}
