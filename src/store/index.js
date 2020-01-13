import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    feverUrl: '',
    apiKey: ''
  },
  getters: {
    getFeverUrl (state) {
      return state.feverUrl
    },
    getApiKey (state) {
      return state.apiKey
    }
  },
  mutations: {
    setFeverUrl (state, url) {
      state.feverUrl = url
    },
    setApiKey (state, key) {
      state.apiKey = key
    }
  },
  actions: {
  },
  modules: {
  }
})
