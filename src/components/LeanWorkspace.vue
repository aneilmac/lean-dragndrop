<template>
  <div class="blocklyDiv" ref="blocklyDiv" />
</template>

<script lang="ts">
import Vue from 'vue';
import * as Blockly from 'blockly';
import {Generator, defineBlocks} from '@aneilmac/blockly-plugin-lean';
import { PropType } from 'vue/types/options';
import {WorkspaceError} from '@/goalWatcher';
import {LevelToolbox} from '@/levelData';
import {Seshat} from '@/theme/seshat';

defineBlocks(Blockly);

export default Vue.extend({
  name: 'LeakWorkspace',
  props: {
    toolbox: Object as PropType<LevelToolbox>,
    lemmaName: String,
    lemmaDecl: String,
    activeErrors: Array as PropType<WorkspaceError[]>
  },
  data(){
    return {
      options: {
        media: 'media/',
        renderer: "thrasos",
        toolbox: {
          kind: "",
          contents: []
        },
        theme: Seshat,
      } as Blockly.BlocklyOptions,
      workspace: null as Blockly.WorkspaceSvg | null,
    }
  },
  computed: {
    initialWorkspaceDOM: function() {
      if (this.lemmaName && this.lemmaDecl) {
        return `
        <xml>
          <block type="lemma" deletable="false" movable="true" editable="false">
            <field name="THEOREM_NAME">${this.lemmaName}</field>
            <field name="THEOREM_DECLARATION">${this.lemmaDecl}</field>
            <data>nat_num_game</data>
          </block>
        </xml>`;
      }
      return `<xml></xml>`;
    }
  },
  mounted() {
    let div = this.$refs["blocklyDiv"];
    if (div instanceof Element) {
      this.workspace = Blockly.inject(div, this.options);

      // Disable anything not added to the lemma specifically.
      this.workspace.addChangeListener(Blockly.Events.disableOrphans);

      // Inject the lemma into the workspace.
      this.updateWorkspace();
    }

    this.workspace?.addChangeListener((event : any) => {
       const emitCodeChange = () => {
         const code = Generator.workspaceToCode(this.workspace as Blockly.Workspace);
          this.$emit('codeChanged', code);
       }

       switch(event.type) {
         case Blockly.Events.BLOCK_DELETE: {
            emitCodeChange();
            break;
         }
         case Blockly.Events.BLOCK_MOVE: {
            // Ignore anything that is not parented to top level item.
            if (event.newParentId) {
              emitCodeChange();
            }
            break;
         }
         case Blockly.Events.BLOCK_CHANGE: {
           if (['field', 'disabled', 'mutation'].includes(event.element)) {
             emitCodeChange();
           }
           break;
         }
         default: 
          break;
       }
    });
  },
  watch: {
    toolbox: function(newTools: LevelToolbox) {
      let blocks = `<xml>${newTools.tactics.join('') + newTools.propositions.join('')}</xml>`;
      this.workspace?.updateToolbox(blocks);
    },
    lemmaName:  function() { this.updateWorkspace(); },
    lemmaDecl: function() { this.updateWorkspace(); },
    activeErrors: function(newVal: WorkspaceError[]) {
      if (this.workspace) {
        const lemmaBlock = this.workspace.getTopBlocks(true)[0];
        const children = lemmaBlock.getChildren(true);
        
        // Clear out old warnings.
        lemmaBlock.setWarningText(null as any);
        let child = children.length > 0 ? children[0] : null;
        while (child != null)
        {
          child.setWarningText(null as any);
          child = child.getNextBlock();
        }

        // Collect all statement blocks.
        let statements = [];
        child = children.length > 0 ? children[0] : null;
        while (child != null)
        {
          statements.push(child);
          child = child.getNextBlock();
        }

        // Apply new warning messages to each statement block we find.
        let unique_id = 0;
        for (const error of newVal) {
          const lineIndex = error.line;
          if (lineIndex < 0 || lineIndex >= statements.length) {
            lemmaBlock.setWarningText(error.message, unique_id.toString());
          } else {
            const child = statements[lineIndex];
            child.setWarningText(error.message, unique_id.toString());
          }
          unique_id++;
        }
      }
    }
  },
  methods: {
    updateWorkspace() {
      if (this.workspace) {
        this.workspace.clear();
        Blockly.Xml.domToWorkspace(
          Blockly.Xml.textToDom(this.initialWorkspaceDOM), 
          this.workspace as Blockly.Workspace);
      }
    }
  }
})
</script>
