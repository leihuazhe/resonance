'use client'
import type { ForwardedRef } from 'react'
import { basicDark } from 'cm6-theme-basic-dark'

import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  toolbarPlugin,
  KitchenSinkToolbar,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  frontmatterPlugin,
  sandpackPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
} from '@mdxeditor/editor'
import { virtuosoSampleSandpackConfig } from './boilerplate'
import { useTheme } from 'next-themes'

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  const { theme } = useTheme()
  return (
    <MDXEditor
      className={`${theme == 'dark' ? 'dark-theme dark-editor' : ''}`}
      contentEditableClassName="mdx-prose"
      plugins={[
        toolbarPlugin({ toolbarContents: () => <KitchenSinkToolbar /> }),
        listsPlugin(),
        quotePlugin(),
        headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin({
          imageAutocompleteSuggestions: [
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
          ],
        }),
        tablePlugin(),
        thematicBreakPlugin(),
        frontmatterPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
        // sandpackPlugin({ sandpackConfig: virtuosoSampleSandpackConfig }),
        codeMirrorPlugin({
          codeBlockLanguages: { js: 'JavaScript', css: 'CSS', txt: 'text', tsx: 'TypeScript' },
          codeMirrorExtensions: [basicDark],
        }),
        // directivesPlugin({
        //   directiveDescriptors: [YoutubeDirectiveDescriptor, AdmonitionDirectiveDescriptor],
        // }),
        // diffSourcePlugin({
        //   viewMode: 'rich-text',
        //   diffMarkdown: 'boo',
        //   codeMirrorExtensions: [basicDark],
        // }),
        markdownShortcutPlugin(),
      ]}
      {...props}
      ref={editorRef}
    />
    // <MDXEditor
    //   plugins={[
    //     // Example Plugin Usage
    //     // H1 - H6
    //     headingsPlugin(),
    //     listsPlugin(),
    //     quotePlugin(),
    //     thematicBreakPlugin(),
    //     markdownShortcutPlugin(),
    //     toolbarPlugin({
    //       toolbarContents: () => <KitchenSinkToolbar />,
    //     }),
    //   ]}
    //   {...props}
    //   ref={editorRef}
    // />
  )
}
