<template>
  <div id="app">
    <!-- <nav id="title-bar">
      <h3>{{ appName }}</h3>
    </nav> -->
    <template v-if="!logined">
      <div class="auth-wrap">
        <transition name="fade">
          <section class="auth">
            <img class="fever-logo" src="./assets/fever-fluid.png" alt="">
            <div class="auth-panel" :class="{ 'logined': logined }">
              <Input class="item" :disabled="logined" prefix="md-link />" placeholder="Fever API 授权URL" v-model="feverAuth.url" />
              <Input class="item" :disabled="logined" prefix="ios-contact" placeholder="授权用户" v-model="feverAuth.user" />
              <Input class="item" :disabled="logined" prefix="ios-lock" placeholder="授权密码" type="password" v-model="feverAuth.pass" />

              <a class="btn-auth" href="javascript:;" @click="authHandle">
                <Icon class="icon-in" type="md-log-in" />
                <Icon class="icon-out" type="md-log-out" />
              </a>
            </div>
          </section>
        </transition>
      </div>
      <div class="not-auth">
        <h1>请先授权fever api</h1>
      </div>
    </template>
    <router-view v-if="logined" />
  </div>
</template>

<script>
import md5 from 'md5'
import EventBus from './utils/bus'
import { getDatabyKey } from './utils/db'
import { fever } from './utils/api'
import { mapMutations } from 'vuex'

let apiKey = ''
let feverUrl = ''

export default {
  name: 'App',
  data () {
    return {
      logined: false,
      appName: 'Fever Reader 1.0',
      feverAuth: {
        url: '',
        user: '',
        pass: ''
      }
    }
  },
  mounted () {
    this.$Spin.show()
    this.getFeverConfig()
  },
  methods: {
    ...mapMutations([
      'setFeverUrl',
      'setApiKey'
    ]),
    async getFeverConfig () {
      await getDatabyKey('feverUrl').then(data => {
        let { value = '' } = data || {}
        feverUrl = value
        this.setFeverUrl(feverUrl)
        this.feverAuth.url = this.feverAuth.url || feverUrl
      }).catch(err => {
        console.log(err)
      })

      await getDatabyKey('apiKey').then(data => {
        let { value = '' } = data || {}
        apiKey = value
        this.setApiKey(apiKey)
        if (apiKey !== '') this.logined = true
        else this.logined = false
      }).catch(err => {
        console.log(err)
      })

      EventBus.$on('auth-expired', data => {
        this.logined = false
        apiKey = ''
      })
      this.$Spin.hide()
    },
    authHandle () {
      const { url = '', user = '', pass = '' } = this.feverAuth
      if (url === '' || user === '' || pass === '') {
        return false
      }
      const apiKey = md5(`${user}:${pass}`)
      fever.auth(url, apiKey).then(data => {
        if (+data.auth === 1) {
          this.setApiKey(apiKey)
          this.setFeverUrl(url)
          this.logined = true
        } else {
          this.logined = false
        }
      }).catch(err => {
        this.$Message.error('请求错误！')
        console.error(err)
      })
    }
  }
}
</script>

<style lang="scss">
$--color-disable: #c5c8ce;
$--color-warn: #ff9900;
$--color-error: #ed4014;
$--color-font: #5cadff;
$--color-border: #dcdee2;
$--color-content: #515a6e;
$--color-title: #17233d;

@mixin flex-left () {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
}

@mixin flex-center () {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

html * {
  box-sizing: border-box;
  -webkit-user-select: none;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

body {
  font-family: -apple-system, "Noto Sans", "Helvetica Neue", Helvetica, "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN", "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti", SimHei, "WenQuanYi Zen Hei Sharp", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.fade-enter, .fade-leave {
  transition: all .5s;
}

.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}

#app {
  height: 100%;
  text-align: center;
  color: #2c3e50;
  background: transparent;
  border-radius: 6px;
  position: relative;
  transition: all .3s;
}

#title-bar {
  -webkit-user-select: none;
  -webkit-app-region: drag;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  height: 36px;
  color: #fff;
  padding: 0 12px;
  background: $--color-content;
  border-bottom: 1px solid $--color-border;
  h3 {
    font-size: 14px;
    font-weight: 500;
    text-shadow: 0 0 1px rgba($color: #000000, $alpha: .3)
  }

}

.auth-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 99;
}
.auth {
  width: 306px;
  padding: 22px 45px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #eaeaea;
  border-top: 3px solid $--color-font;
  opacity: .9;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  transition: all .6s;

  a {
    padding: 0;
    margin: 0;
    text-decoration: none;
    line-height: 1;
  }
  .fever-logo {
    width: 64px;
    height: 64px;
    margin: 8px 0 20px 0;
    overflow: hidden;
    display: block;
    opacity: .6;
    filter: grayscale(100%);
  }
  .auth-panel {
    flex: 1;
    height: 100%;
    .item {
      margin: 6px auto;
    }
    .ivu-icon {
      transition: all .3s;
    }
    .btn-auth {
      display: inline-block;
      overflow: hidden;
      width: 36px;
      height: 36px;
      position: relative;
      margin-top: 15px;
      .ivu-icon {
        margin: 0;
        font-size: 36px;
        position: absolute;
        left: 0;
        top: 0;
      }
      .icon-in {
        transform: translate3d(0, 0, 0);
      }
      .icon-out {
        color: $--color-error;
        transform: translate3d(37px, 0, 0);
      }
    }
  }
  .auth-panel.logined {
    .ivu-icon { color: $--color-disable; }
    a {
      .icon-in {
        transform: translate3d(-37px, 0, 0);
      }
      .icon-out {
        color: $--color-error;
        transform: translate3d(0, 0, 0);
      }
    }
  }
}

.auth:hover {
  box-shadow: 1px 2px 6px rgba(0, 0, 0, .3);
}

.not-auth {
  width: 100%;
  height: 100%;
  background: #f2f2f2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  h1 {
    margin-top: 10%;
    font-weight: 400;
    color: $--color-disable;
    text-shadow: 1px 1px 0px rgba(#fff, 1);
  }
}
</style>
