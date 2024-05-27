'use client'

import '@mdxeditor/editor/style.css'
import { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor'
import dynamic from 'next/dynamic'
import { Suspense, forwardRef, useRef } from 'react'

// This is the only place InitializedMDXEditor is imported directly.
const EditorComp = dynamic(() => import('@/components/mdx-editor/initialized-mdx-editor'), {
  // Make sure we turn SSR off
  ssr: false,
})

const markdown = `
Hello **world**!
`

export default function EditorHome() {
  const editorRef = useRef(null)
  return (
    <div className="mdxeditor">
      <p>
        This is a bare-bones unstyled MDX editor without any plugins and no toolbar. Check the
        EditorComponent.tsx file for the code.
      </p>
      <p>
        To enable more features, add the respective plugins to your instance - see{' '}
        <a className="text-blue-600" href="https://mdxeditor.dev/editor/docs/getting-started">
          the docs
        </a>{' '}
        for more details.
      </p>
      <br />
      <div style={{ border: '1px solid black' }}>
        <Suspense fallback={null}>
          <EditorComp editorRef={editorRef} markdown={markdown} />
        </Suspense>
      </div>
    </div>
  )
}
