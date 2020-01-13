<template>
  <div class="layout-main">
    <div class="sider-wrap">
      <h2>分类<span v-if="unReadItems > 0">({{ unReadItems }})</span></h2>
      <Sider class="sider">
        <Menu width="auto">
          <template v-for="g in groups">
            <Submenu :key="g.id" :name="g.id">
              <template slot="title">
                <Icon type="ios-keypad"></Icon>
                <span>{{ g.title }}</span>
              </template>
              <template v-for="(f, idx) in g.feeds">
                <MenuItem :key="idx" :name="g.id + '-' + f.id">
                  <img class="icon" :class="{ 'no-icon': f.favicon_data === '' }" :src="f.favicon_data === '' ? defaultIcon : 'data:' + f.favicon_data" />
                  <span>{{ f.title }}</span>
                </MenuItem>
              </template>
            </Submenu>
          </template>
        </Menu>
      </Sider>
      <p class="info">Narky &lt;master@imhx.me&gt; &copy; 2020</p>
    </div>
    <Layout class="content-main">

    </Layout>
  </div>
</template>

<script>
import _map from 'lodash/map'
import _find from 'lodash/find'
import _forEach from 'lodash/forEach'
import { fever } from '../utils/api'
import { mapGetters } from 'vuex'

let _groups = {}
let _feedsGroups = []

export default {
  name: 'Main',
  data () {
    return {
      isCollapsed: false,
      defaultIcon: require('../assets/fever-fluid.png'),
      groups: {},
      feeds: [],
      favicons: [],
      unReadItems: 0
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
    getIconData (id) {
      if (this.favicons.length <= 0 || +id === 0) return ''
      const icon = _find(this.favicons, {
        id: id
      })
      return icon.data || ''
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
    async fetchUnRead () {
      await fever.fetch(this.feverUrl, ['unread_item_ids']).then(data => {
        if (+data.auth === 1) {
          this.unReadItems = data.unread_item_ids.split(',').length
        }
      })
    }
  }
}
</script>

<style lang="scss">
.layout-main {
  height: 100vh;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  h2 {
    color: #f4f4f5;
    background: #373e50;
    padding: 10px 0;
    border-bottom: 1px solid #fff;
    height: 50px;
    width: 100%;
  }
  .ivu-menu-submenu {
    border-bottom: 1px solid #dcdee2;
  }
  .ivu-menu-submenu-title {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
  }
  .ivu-menu-item {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding-top: 8px;
    padding-bottom: 8px;
    .icon {
      width: 16px;
      height: auto;
      overflow: hidden;
      margin-right: 6px;
    }
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
    }
  }

  .ivu-menu-vertical.ivu-menu-light:after { display: none; }

  .sider-wrap {
    border-right: 1px solid #dcdee2;
    background: #fff;
    height: 100vh!important;
    width: 25vw!important;
    max-width: 25vw!important;
    min-width: 120px!important;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
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
    overflow: auto;
  }
}
</style>
