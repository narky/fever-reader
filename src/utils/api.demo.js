import md5 from 'md5'
import _ from 'lodash'
import axios from 'axios'
import ApiList from './api-list'
import apiConfig, { replacements } from '../config'
import { platform, windowSize } from './utils'
// import $this from '../main'

// 接口请求前缀替换表
const prefixReplacements = _.assignIn(replacements, {})
const sec = 1000
const defaultTimeout = 10
const ws = windowSize()
let CancelToken = axios.CancelToken
let cancel

const _getToken = () => {
  return localStorage.getItem('token') || ''
}

const _getGeoLocation = () => {
  const { latitude = '', longitude = ''} = JSON.parse(localStorage.getItem('geoLocation') || '{}')
  return { latitude, longitude }
}

const _signMd5 = json => {
  let arr = []
  let keys = _.map(Object.keys(json), key => {
    if (typeof json[key] !== 'undefined' && json[key] !== null && key !== 'sign') {
      return key
    }
  })
  keys = keys.sort()
  _.forEach(keys, k => {
    let val = json[k]
    if (typeof val === 'undefined' || val === null) val = ''
    val = (typeof val === 'object') ? JSON.stringify(val) : val + ''
    arr.push(k.toUpperCase() + val)
  })

  return md5(arr.join('') + apiConfig.md5Salt)
}

const _parseJSON = str => {
  if (typeof str === 'undefined') {
    return {}
  }
  if (typeof str === 'object') {
    return str
  }
  try {
    return JSON.parse(str)
  // eslint-disable-next-line
  } catch (ex) {}
  // 如果是个纯的字符串，走下面
  // try {
  //   let _json = JSON.parse(JSON.stringify({ obj: str }))
  //   return _json.obj
  // } catch (ex) { }
  // eslint-disable-next-line
  return (new Function("", "return " + str))()
}

const _getUrlPrefix = key => {
  let cfg = apiConfig[key]
  let host = apiConfig['host'] || ''
  return (host === '') ? cfg : host + cfg
}

const _getUrl = key => {
  // if (typeof ApiList[m] === 'undefined' || !ApiList[m]) return ''
  if (typeof ApiList[key] === 'undefined' || ApiList[key] === '') return ''
  let url = ApiList[key]
  _.forEach(prefixReplacements, (val, key) => {
    let regex = new RegExp(`{${key}}`, 'gi')
    url = url.replace(regex, _getUrlPrefix(val))
  })
  // console.log(url)
  return url
}

const _parseUrl = (initConfig, postData) => {
  let { url, type = 'post' } = initConfig
  // 支持key直接获取url
  const urlKey = url.replace(/^@/ig, '')
  if (url.indexOf('@') === 0) url = _getUrl(urlKey)
  let querystring = {}
  if (type === 'get') querystring = postData
  if (type === 'post') querystring = initConfig['querystring'] || {}
  _.forEach(querystring, (val, key) => {
    url = url.replace(`{${key}}`, val)
  })
  // 过滤掉多余的参数
  url = url.replace(/\/\{(.+?)\}/gi, '')
  return url
}

const _axiosInit = initConfig => {
  let { url, data, type = 'post' } = initConfig

  let postData = {}
  let _data = _.assign({}, data)
  _.forEach(_data, (val, key) => {
    if (['timeout'].indexOf(key) === -1) postData[key] = val
  })

  if (type === 'post') {
    postData['timestamp'] = (new Date()).getTime()
    postData['sign'] = _signMd5(postData)
  }

  url = _parseUrl(initConfig, postData)

  axios.defaults.headers.common['Content-Type'] = 'application/json; charset=utf-8'
  axios.defaults.headers.common["mmChannel"] = "mmdWechat_" + platform.toLowerCase()
  axios.defaults.headers.common["screenWidth"] = ws.width
  axios.defaults.headers.common["screenHeight"] = ws.height
  axios.defaults.headers.common['mmTs'] = (new Date()).getTime()
  // axios.defaults.headers.common['mmTicket'] = _getToken()

  axios.interceptors.request.use(
    config => {
      config = _.assignIn(config, {
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
      let respData = resp.data
      respData['errorCode'] && (respData['errorCode'] = ~~(respData['errorCode']))
      respData['result'] && (respData['result'] = _parseJSON(respData['result']))
      respData['code'] = ~~(respData['code'])
      respData['content'] = _parseJSON(respData['content'])
      resp.data = respData
      const errorCode = respData['code']
      // console.log(errorCode)
      // 登录超时处理
      if ([2002, 2004, 111].indexOf(errorCode) !== -1) {
        localStorage.removeItem('token')
        localStorage.removeItem('userinfo')
        // $this.$router.push('/')
        window.location.reload()
        return Promise.resolve(resp)
      }
      // else if (errorCode !== 0) {
      //   $this.$error({
      //     title: '提示',
      //     content: respData.message
      //   })
      //   return Promise.resolve(resp)
      // }
      return resp
    },
    err => {
      return Promise.reject(err.response)
    }
  )

  return {
    apiUrl: url,
    postData
  }
}

const post = async (url, data, querystring = {}) => {
  const { apiUrl, postData } = _axiosInit({ url, data: data, querystring, type: 'post' })
  const timeout = ((data && data['timeout']) ? data['timeout'] : defaultTimeout) * sec
  const { latitude, longitude } = _getGeoLocation()

  return axios.post(apiUrl, postData, {
    timeout: timeout,
    headers: {
      'mmTicket': _getToken(),
      'latitude': latitude,
      'longitude': longitude
    }
  })
    .then(resp => {
      return Promise.resolve(resp.data)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

const get = async (url, data) => {
  const { apiUrl } = _axiosInit({ url, data: data, type: 'get' })
  const timeout = ((data && data['timeout']) ? data['timeout'] : defaultTimeout) * sec
  const { latitude, longitude } = _getGeoLocation()

  return axios.get(apiUrl + '?_t=' + (new Date()).getTime(), {
    timeout: timeout,
    headers: {
      'mmTicket': _getToken(),
      'latitude': latitude,
      'longitude': longitude
    }
  })
    .then(resp => {
      return Promise.resolve(resp.data)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

const upload = async (url, data, querystring = {}) => {
  if (!('file' in data)) {
    return Promise.reject(new Error('没有上传文件'))
  }

  const { apiUrl } = _axiosInit({ url, data: data, querystring, type: 'post' })
  const timeout = ((data && data['timeout']) ? data['timeout'] : defaultTimeout) * sec
  const { latitude, longitude } = _getGeoLocation()

  let { file } = data
  let form = new FormData()
  _.forEach(file, (v, k) => {
    form.append(k, v)
  })
  _.forEach(data, (v, k) => {
    if (k !== 'file' && k !== 'timeout') {
      form.append(k, v)
    }
  })

  return axios.post(apiUrl, form, {
    timeout: timeout,
    headers: {
      'Content-Type': 'multipart/form-data',
      'mmTicket': _getToken(),
      'latitude': latitude,
      'longitude': longitude
    }
  })
    .then(resp => {
      return Promise.resolve(resp.data)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export default {
  post,
  get,
  upload,
  getUrl: _getUrl,
  parseJSON: _parseJSON,
  cancel: () => {
    cancel && cancel()
  }
}
