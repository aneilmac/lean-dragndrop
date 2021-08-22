<template>
  <div class="container">
  <div class="i9">
    <div id="code_container"><h1>Code</h1>{{code}}</div>
    <div id="message_container"><h1>Messages</h1>{{messages}}</div>
  </div>
  <LeanWorkspace id="blockly_container" :options="options" ref="foo" v-on:codeChanged="onCodeChanged" />
</div>
</template>

<script>
import Vue from 'vue';
import LeanWorkspace from '@/components/LeanWorkspace.vue';
import calculateColumnRow from '@/utils/lineCounter';

export default {
  name: 'block-coder',
  components: {
    LeanWorkspace
  },
  data() {
    return {
      code: '',
      messages: '',
      options: {
        media: 'media/',
        grid:
          {
            spacing: 25,
            length: 3,
            colour: '#ccc',
            snap: true
          },
      }
    }
  },
  mounted() {
    const lemma = 'lemma example1 (x y z : ℕ) : x * y + z = x * y + z :=';
    const outcode = `${lemma}\nbegin\n${this.code},\nend`;
    Vue.prototype.$leanServer.sync('test.lean', outcode)
      .catch((err) => console.log('error while syncing file:', err));
  },
  methods: {
    onCodeChanged(code) {
      this.code = code;

      const lemma = 'lemma example1 (x y z : ℕ) : x * y + z = x * y + z :=';
      const endcode = '\nend\n#print "EOF"';
      const outcode = `${lemma}\nbegin\n${this.code}${endcode}`;
      Vue.prototype.$leanServer.sync('test.lean', outcode)
        .catch((err) => console.log('error while syncing file:', err));

      let { row, column} = calculateColumnRow(outcode, outcode.length - endcode.length - 2);

      Vue.prototype.$leanServer.info('test.lean', row, column)
        .then((res) => this.messages = JSON.stringify(res))
        .catch((err) => this.messages = err.toString());
    }
  }
}
</script>

<style>
.container {
  display: grid; 
  grid-auto-flow: row dense; 
  grid-template-columns: 1fr 1fr; 
  grid-template-rows: 1fr; 
  gap: 0px 0px; 
  grid-template-areas: 
    ". blockly_container"; 
}
.i9 {
  display: grid; 
  grid-template-columns: 1fr; 
  grid-template-rows: 1fr 1fr; 
  gap: 0px 0px; 
  grid-template-areas: 
    "code_container"
    "message_container"; 
}
#code_container { grid-area: code_container; }
#message_container { grid-area: message_container; }
#blockly_container { grid-area: blockly_container; height: 98vh; }
</style>
