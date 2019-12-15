import axios from 'axios'
import md5 from 'md5'

const apiEndPoints = {
  auth: 'api'
}

const getFeverUrl = (url, ep) => {
  return `${url}?${apiEndPoints[ep]}`
}

export const auth = (url, user, pass) => {
  return new Promise((resolve, reject) => {
    if (user === '' || pass === '') {
      reject(new Error('user or pass can not be empty'))
    }
    const apiKey = md5(`${user}:${pass}`)
    const formData = `api_key=${apiKey}`
    axios({
      url: getFeverUrl(url, 'auth'),
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(resp => {
      if (+resp.status === 200) {
        resolve(resp.data)
      } else {
        reject(new Error(resp.status))
      }
    }).catch(err => {
      reject(err)
    })
  })
}
