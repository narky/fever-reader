<template>
  <div class="layout-main">
    <div class="sider-wrap">
      <h2 class="sider-header">
        未读
        <span class="unread-num" v-if="unreadItemCount > 0">{{ unreadItemCount }}</span>
        <i-switch size="large" v-model="onlyShowUnread">
          <span slot="open">未读</span>
          <span slot="close">所有</span>
        </i-switch>
      </h2>
      <Sider class="sider">
        <i-menu width="auto" :accordion="true" @on-select="listFeedItems">
          <template v-for="g in groups">
            <Submenu :key="g.id" :name="g.id">
              <template slot="title">
                <Icon type="md-bookmark" />
                <span>{{ g.title }}</span>
              </template>
              <template v-for="(f, idx) in g.feeds">
                <MenuItem
                  :key="idx"
                  :name="g.id + '-' + f.id"
                  :class="[
                    { 'no-unread' : f.unreadNum === 0 },
                    { 'hide-unread': onlyShowUnread && f.unreadNum === 0}
                  ]"
                >
                  <img class="icon" :class="{ 'no-icon': f.favicon_data === '' }" :src="f.favicon_data === '' ? defaultIcon : 'data:' + f.favicon_data" />
                  <span>{{ f.title }}</span>
                  <em v-if="unreadItemReadOk">{{ f.unreadNum }}</em>
                </MenuItem>
              </template>
            </Submenu>
          </template>
        </i-menu>
      </Sider>
      <a href="javascript:;" class="logout" @click="handleLogout"><Icon type="ios-close-circle-outline" /><span>注销</span></a>
    </div>
    <Layout class="content-main">
      <h1 class="not-select-feed" v-if="!showFeedItems">请选择一个订阅</h1>
      <div class="ctrl" v-if="showFeedItems">
        <h4>
          <img class="icon" :class="{ 'no-icon': currentFeed.favicon_data === '' }" :src="currentFeed.favicon_data === '' ? defaultIcon : 'data:' + currentFeed.favicon_data" />
          <span>{{ currentFeed.title }}</span>
        </h4>
        <div class="feed-info">
          <span>{{listItems.length}}未读</span>
          <a href="javascript:;">全部标为已读 <Icon type="md-done-all" /></a>
        </div>
      </div>
      <div class="item-list" :class="{'no-items': listItems.length <= 0}" v-if="showFeedItems">
        <h1>- 没有未读文章 -</h1>
        <div class="list-wrap">
          <ul>
            <li v-for="(item, idx) in listItems" :key="idx">
              <span class="love"><Icon type="md-heart-outline" /></span>
              <b>{{ item.title }}</b>
              <span class="description">{{ item.html | stripHTMLTag }}</span>
              <Time class="time" :time="item.created_on_time" />
            </li>
          </ul>
          <div class="end-of-items">- 到底了 -</div>
        </div>
      </div>
    </Layout>
  </div>
</template>

<script>
import Vue from 'vue'
import _map from 'lodash/map'
import _find from 'lodash/find'
import _forEach from 'lodash/forEach'
import { fever } from '../utils/api'
import { mapGetters } from 'vuex'
import EventBus from '../utils/bus'
import { stripHTMLTag } from '../utils/util'

Vue.filter('stripHTMLTag', stripHTMLTag)

// 排序比较算法
const sortCompare = p => {
  return (m, n) => {
    const a = m[p]
    const b = n[p]
    return b - a
  }
}

const batchNum = 50
let _groups = {}
let _feedsGroups = []
let _feedItems = {}
let _readBatch = 0
let _readItemCount = 0

export default {
  name: 'Main',
  data () {
    return {
      isCollapsed: false,
      defaultIcon: require('../assets/fever-fluid.png'),
      groups: {},
      feeds: [],
      favicons: [],
      onlyShowUnread: false,
      unreadItemCount: 0,
      unreadItemReadOk: true,
      unreadItems: {},
      showFeedItems: false,
      listItems: [],
      currentFeed: {}
    }
  },
  computed: {
    ...mapGetters({
      apiKey: 'getApiKey',
      feverUrl: 'getFeverUrl'
    }),
    menuitemClasses () {
      return [
        'menu-item',
        this.isCollapsed ? 'collapsed-menu' : ''
      ]
    }
  },
  mounted () {
    this.$Spin.show({
      render: (h) => {
        return h('div', [
          h('Icon', {
            'class': 'spin-icon-load',
            props: {
              type: 'ios-loading',
              size: 18
            }
          }),
          h('div', '加载订阅...')
        ])
      }
    })
    this.fetchIcons().then(() => {
      this.fetchGroups().then(() => {
        Promise.all([
          this.fetchFeeds(),
          this.fetchUnRead()
        ])
      })
    })
  },
  methods: {
    handleLogout () {
      this.$Modal.confirm({
        title: '注销',
        content: '<p>确实要注销吗？</p>',
        loading: true,
        onOk: () => {
          EventBus.$emit('auth-expired', 1)
          this.$Modal.remove()
        }
      })
    },
    getIconData (id) {
      if (this.favicons.length <= 0 || +id === 0) return ''
      const icon = _find(this.favicons, {
        id: id
      })
      return icon.data || ''
    },
    orgItems (items) {
      _forEach(items, f => {
        let _idsArr = _feedItems[f.feed_id] || []
        _idsArr.push(f)
        _feedItems[f.feed_id] = [].concat(_idsArr)
        // 按照时间重新排序
        _feedItems[f.feed_id] = _feedItems[f.feed_id].sort(sortCompare('created_on_time'))
      })

      if (_readItemCount === +this.unreadItemCount) {
        // 全部读完，处理各个订阅显示未读数
        this.unreadItemReadOk = true
        this.unreadItems = _feedItems

        let _groups = this.groups
        _forEach(_groups, g => {
          let _feeds = _map(g.feeds, f => {
            let _unreadItems = _feedItems[f.id] || []
            f['unreadNum'] = _unreadItems.length || 0
            return f
          })
          g['feeds'] = _feeds
        })
        this.groups = _groups
        this.$Spin.hide()
      }
    },
    fetchIcons () {
      return new Promise(async (resolve, reject) => {
        await fever.fetch(this.feverUrl, ['favicons']).then(data => {
          if (+data.auth === 1) {
            this.favicons = data.favicons || []
            resolve()
          } else reject(new Error(''))
        }).catch(err => {
          reject(err)
        })
      })
    },
    fetchGroups () {
      return new Promise(async (resolve, reject) => {
        await fever.fetch(this.feverUrl, ['groups']).then(data => {
          if (+data.auth === 1) {
            const { groups, feeds_groups } = data
            _feedsGroups = feeds_groups || []
            _forEach((groups || []), g => {
              if (['All', 'all'].indexOf(g.title) !== -1) g.title = '未分类'
              _groups[g.id] = g
            })
            resolve()
          }
        }).catch(err => {
          reject(err)
        })
      })
    },
    async fetchFeeds () {
      await fever.fetch(this.feverUrl, ['feeds']).then(data => {
        if (+data.auth === 1) {
          let _feeds = _map((data.feeds || []), f => {
            f.favicon_data = this.getIconData(f.favicon_id)
            f['unreadNum'] = 0
            return f
          })

          _forEach(_feedsGroups, fg => {
            let feeds = []
            let _ids = _map(fg.feed_ids.split(','), id => +id)
            _forEach(_feeds, f => {
              if (_ids.indexOf(f.id) !== -1) feeds.push(f)
              _groups[fg.group_id]['feeds'] = feeds
            })
          })

          this.feeds = _feeds
          this.groups = _groups
        }
      })
    },
    // 分批读取所有未读 feverapi限制50个一批
    batchReadItems (ids) {
      if (_readBatch > 20) {
        _readItemCount = this.unreadItemCount
        this.orgItems('')
        return
      }

      let idArray = ids.split(',')
      if (idArray.length > batchNum) {
        let _tmpArr = idArray.slice(0, batchNum)
        let _tmp1Arr = idArray.slice(batchNum)
        this.fetchItems(_tmpArr.join(',')).then(() => {
          this.batchReadItems(_tmp1Arr.join(','))
        })
      } else {
        this.fetchItems(idArray.join(','))
      }
    },
    async fetchUnRead () {
      await fever.fetch(this.feverUrl, ['unread_item_ids']).then(data => {
        if (+data.auth === 1) {
          let unreadItems = data.unread_item_ids
          let _tmpArr = _map(unreadItems.split(','), n => +n)
          unreadItems = _tmpArr.sort((a, b) => {
            return b - a
          }).join(',')

          this.unreadItemCount = unreadItems.split(',').length
          // this.$Spin.hide()
          this.batchReadItems(unreadItems)
        }
      })
    },
    async fetchItems (ids) {
      _readBatch += 1
      console.log('===> 读取批次： ' + _readBatch + '，读取数量： ' + ids.split(',').length)

      let params = ['items']
      params.push(`with_ids=${ids}`)
      await fever.fetch(this.feverUrl, params).then(data => {
        if (+data.auth === 1) {
          _readItemCount += data.items.length
          this.orgItems(data.items)
        }
      })
    },
    listFeedItems (menuName) {
      let [groudId, feedId] = menuName.split('-')
      let _items = this.unreadItems[feedId] || []
      this.listItems = _items

      let _feed = _find(this.feeds, f => {
        return +f.id === +feedId
      })
      this.currentFeed = _feed

      this.showFeedItems = true
    }
  }
}
</script>

<style lang="scss">
@keyframes ani-spin {
  from { transform: rotate(0deg);}
  50%  { transform: rotate(180deg);}
  to   { transform: rotate(360deg);}
}
.spin-icon-load{
  animation: ani-spin 1s linear infinite;
}

.layout-main {
  height: 100vh;
  background: #f5f7f9;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;

  .icon {
    width: 16px;
    height: auto;
    overflow: hidden;
    margin-right: 6px;
  }

  .ivu-menu-submenu {
    border-bottom: 1px solid #dcdee2;
    &:last-child {
      border-bottom: none;
    }
  }
  .ivu-menu-submenu-title {
    color: #475966;
    font-weight: 600;
    background: #f8f8f9;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: 6px 12px !important;
  }
  .ivu-menu-submenu-title-icon {
    right: 12px;
  }
  .ivu-menu-item {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: 8px 12px !important;
    &:hover { background: #e8eaec; }
    .no-icon {
      opacity: .8;
      filter: grayscale(100%);
    }
    span {
      flex: 1;
      text-align: left;
      overflow: hidden;
      white-space: nowrap;
      word-break: keep-all;
      text-overflow: ellipsis;
      font-size: 13px;
      color: #1a2833;
    }
    em {
      font-style: normal;
      font-size: 12px;
      text-align: right;
    }
  }
  .ivu-menu-item-active:not(.ivu-menu-submenu) {
    span {
      font-weight: 700;
      color: #2b85e4;
    }
  }
  .ivu-menu-item.no-unread {
    color: #c5c8ce;
    span { color: #c5c8ce; }
    em { display: none; }
  }
  .ivu-menu-item.hide-unread {
    display: none;
  }

  .ivu-menu-vertical.ivu-menu-light:after { display: none; }

  .sider-wrap {
    min-width: 290px;
    max-width: 340px;
    width: 298px;
    height: 100vh;
    background: #fff;
    padding-bottom: 8px;
    margin-right: 6px;
    // margin: 12px 8px 0;
    // border-radius: 6px;
    box-shadow: 1px 0 4px rgba($color: #000000, $alpha: .3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    .sider-header {
      text-align: left;
      font-size: 16px;
      font-weight: 400;
      color: #1a2833;
      background: #f8f8f9;
      border-bottom: 1px solid #dcdee2;
      padding: 6px 12px;
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
      .unread-num {
        flex: 1;
        margin: 0 8px;
      }
    }
  }

  .logout {
    display: block;
    width: 100%;
    font-size: 1.1em;
    border: 1px solid #ed4014;
    color: #ed4014;
    background: #fff;
    padding: 6px 0;
    margin-bottom: -8px;
    span { margin-left: 6px; }
    &:hover {
      background: #ed4014;
      color: #fff;
    }
  }

  .sider {
    background: #fff;
    overflow: auto;
    height: 100%;
    width: 100%!important;
    max-width: 100%!important;
    min-width: 100%!important;
    flex: 1 !important;
  }

  .info {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    height: 40px;
    font-size: 12px;
    color: #373e50;
    text-shadow: 0 1px 2px #fff;
    width: 100%;
    background: #f5f7f9;
    border-top: 1px solid #fff;
  }

  .content-main {
    flex: 1;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;

    .not-select-feed {
      flex: 1;
      font-size: 2em;
      font-weight: 400;
      color: #c5c8ce;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .ctrl {
      width: 100%;
      height: 37px;
      max-height: 37px;
      background: #e6e6e6;
      border-bottom: 1px solid #dcdee2;
      background: url('../assets/gradient_bright.png') 0 0 repeat-x;
      background-size: auto;
      padding: 5px 20% 5px 18px;
      margin-bottom: 5px;
      position: relative;
      z-index: 99;
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
      h4 {
        font-size: 18px;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        flex: 1;
        margin-right: 10px;
      }
      .feed-info {
        color: #585858;
        height: 100%;
        padding-right: 20px;
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        position: absolute;
        right: 0;
        top: 0;
        span,
        a {
          color: #585858;
          display: block;
          padding: 0 5px;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
          align-items: center;
          &:hover {
            background: #ccc;
          }
        }
        span {
          margin-right: 1px;
        }
        span:after {
          content: " ";
          display: block;
          width: 1px;
          height: 1em;
          background: #ccc;
          position: absolute;
          right: -1px;
          top: 50%;
          transform: translateY(-50%);
        }
      }
    }

    .item-list {
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: auto;
      h1 { display: none; }
      ul {
        padding: 7px;
        li {
          cursor: pointer;
          border-bottom: 1px solid #dcdee2;
          background: #fff;
          padding: 7px 7px 7px 12px;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: center;
          &:hover {
            background: #e6e6e6;
          }
          b {
            color: #000;
            font-size: 1em;
            font-weight: bold;
          }
          .love {
            margin-right: 14px;
          }
          .description {
            flex: 1;
            text-align: left;
            color: #383838;
            opacity: .9;
            margin-left: 6px;
            overflow: hidden;
            white-space: nowrap;
            word-break: keep-all;
            text-overflow: ellipsis;
          }
          .time {
            color: #383838;
            font-size: 11px;
            margin-left: 5px;
          }
        }
      }
      .end-of-items {
        padding: 20px;
        font-size: 1.1em;
        color: #c5c8ce;
      }
    }
    .item-list.no-items {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      h1 {
        display: flex;
        font-size: 2em;
        font-weight: 400;
        color: #c5c8ce;
      }
      .list-wrap { display: none; }
    }
  }
}
</style>
