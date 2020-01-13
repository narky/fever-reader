import axios from 'axios'
import _assignIn from 'lodash/assignIn'
import EventBus from './bus'
import { getDatabyKey, setDatabyKey } from './db'

const sec = 1000
const defaultTimeout = 10
let CancelToken = axios.CancelToken
let cancel = null

const getFeverUrl = (url, querystring = []) => {
  let apiUrl = `${url}?api`
  let params = [].concat(apiUrl, querystring)
  return params.join('&')
}

const getFeverApiKeyFromDB = async () => {
  const apiKey = await getDatabyKey('apiKey').then(data => {
    let { value = '' } = data || {}
    return value
  })
  return apiKey
}

const axioInit = async (config) => {
  const { url = '', querystring = [], data = null } = config || {}
  axios.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded'

  axios.interceptors.request.use(
    config => {
      config = _assignIn(config, {
        cancelToken: new CancelToken(function executor (c) {
          // An executor function receives a cancel function as a parameter
          cancel = c
        })
      })
      return config
    },
    error => {
      return Promise.reject(error)
    }
  )

  axios.interceptors.response.use(
    resp => {
      const { status, data } = resp
      if (+status >= 200 || +status < 300) {
        return Promise.resolve(resp)
      } else {
        return Promise.reject(new Error('api request error.'))
      }
    },
    err => {
      return Promise.reject(err)
    }
  )

  let postData = data
  if (data === null) {
    let apiKey = await getFeverApiKeyFromDB()
    postData = `api_key=${apiKey}`
  }

  return {
    apiUrl: getFeverUrl(url, querystring),
    postData: postData
  }
}

const post = async (config) => {
  let { apiUrl, postData } = await axioInit(config)
  return axios.post(apiUrl, postData, { timeout: defaultTimeout * sec })
    .then(resp => {
      return Promise.resolve(resp.data)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

const feverApi = {}

feverApi.auth = (url, apiKey = '') => {
  return new Promise((resolve, reject) => {
    const formData = `api_key=${apiKey}`
    post({ url, data: formData }).then(data => {
      const { auth } = data
      if (+auth === 1) {
        // 授权成功
        setDatabyKey('apiKey', apiKey)
        setDatabyKey('feverUrl', url)
        resolve(data)
      }
    }).catch(err => {
      reject(err)
    })
  })
}

feverApi.fetch = (url, querystring = []) => {
  return new Promise((resolve, reject) => {
    post({ url, querystring }).then(data => {
      if (+data.auth === 0) EventBus.$emit('auth-expired', 1)
      resolve(data)
    }).catch(err => {
      reject(err)
    })
  })
}

export const fever = feverApi
