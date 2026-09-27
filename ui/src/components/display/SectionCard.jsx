import { Sheet } from '../paper/Sheet.jsx'

/**
 * SectionCard — titled working paper. Thin alias over `paper/Sheet` kept for
 * the pages that already import it.
 */
export function SectionCard({ title, subtitle, action, reference, className, contentClassName, children }) {
  return (
    <Sheet title={title} subtitle={subtitle} action={action} reference={reference} className={className} contentClassName={contentClassName}>
      {children}
    </Sheet>
  )
}
