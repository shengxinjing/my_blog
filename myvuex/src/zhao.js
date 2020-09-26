
// zhao.js

let Vue
class Store {
  constructor(options={}) {
    // this.name = '赵政委'
    this._vm = new Vue({
      data:{
        state:options.state
      }
    })
    // 根模块
    this.root = null
    this.mutations = {}
    this.actions = {}
    this.getters = {}
    // 注册一下module，递归，变成一个大的对象 挂载到root
    this.register([], options)
    this.installModules(options.state, [], this.root)
  }
  get state(){
    return this._vm._data.state
  }
  register(path, module){
    const newModule = {
      children: {},
      module: module,
      state: module.state
    }
    if(path.length){
      // path有值，子模块
      const parent = path.slice(0, -1).reduce((module, key) => {
        return module.children[key];
      }, this.root);
      parent.children[path[path.length - 1]] = newModule;
    }else{
      // 空 就是根目录
      this.root = newModule
    }
    if(module.modules){
      this.forEachObj(module.modules,(name,mod)=>{
        // console.log(123,name,mod)
        this.register([...path,name],mod)
      })
    }
  }
  forEachObj(obj={},fn){
    Object.keys(obj).forEach(key=>{
        fn(key, obj[key])
    })
  }
  commit = (type,arg)=>{
    this.mutations[type](this.state,arg)
  }
  dispatch(type, arg){
    this.actions[type]({
      commit:this.commit,
      state:this.state
    }, arg)
  }
  last(arr){
    return arr[arr.length-1]
  }
  installModules(state,path,module){
    // 安装所有的module的mutation，actions，
    if(path.length>0){
      const moduleName = this.last(path);
    // 默认名字都注册在一个命名空间里
      Vue.set(state, moduleName,module.state)
    }
    // 设置上下文，获取state要遍历 path
    const context = {
      dispatch: this.dispatch,
      commit: this.commit,
    }
    Object.defineProperties(context, {
      getters: {
        get: () => this.getters
      },
      state: {
        get: () => {
          let state = this.state;
          return path.length ? path.reduce((state, key) => state[key], state) : state
        }
      }
    })
    // 注册mutations 传递正确的state
    this.registerMutations(module.module.mutations,context)
    // 注册action
    this.registerActions(module.module.actions,context)

    // 注册getters
    this.registerGetters(module.module.getters,context)

    // 递归
    this.forEachObj(module.children, (key,child)=>{
      this.installModules(state, [...path,key],child)
    })
  }
  handleGetters(getters){
    Object.keys(getters).forEach(key=>{
      Object.defineProperty(this.getters,key,{
        get:()=>{
          return getters[key](this.state)
        }
      })
    })
  }
  registerGetters(getters, context){
    this.forEachObj(getters,(key,getter)=>{
      Object.defineProperty(this.getters,key,{
        get:()=>{
          return getter(
            // module的state
            context.state,
            context.getters,
            // 最外层的store
            this.state
          )
        }
      })
    })

  }
  registerMutations(mutations, context){
    if(mutations){
      this.forEachObj(mutations, (key,mutation)=>{
        this.mutations[key] = ()=>{
          mutation.call(this, context.state)
        }
      })
    }
  }
  registerActions(actions,context){
    if(actions){
      this.forEachObj(actions, (key,action)=>{
        this.actions[key] = ()=>{
          action.call(this, context)
        }
      })
    }
  }
}

function install(_Vue) {
  // 这样store执行的时候，就有了Vue，不用import
  // 这也是为啥 Vue.use必须在新建store之前
  Vue = _Vue
  _Vue.mixin({
    beforeCreate(){
      // 这样才能获取到传递进来的store
      // 只有root元素才有store，所以判断一下
      if(this.$options.store){
        _Vue.prototype.$store = this.$options.store

      }
    }
  })
}

function mapState(obj){
  const ret = {}
  Object.keys(obj).forEach((key)=>{
    // 支持函数
    let val = obj[key]
    ret[key] = function(){
      const state = this.$store.state
      return typeof val === 'function'
                          ? val.call(this, state)
                          : state[val]
    } 

  })
  return ret
}
function mapMutations(mutations){
  const ret = {}
  mutations.forEach((key)=>{
    ret[key] = function(){
      const commit = this.$store.commit
      commit(key)
    } 

  })
  return ret
}
export default { Store, install }
export {mapState, mapMutations}
