'use client'

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-center flex-wrap gap-4')}
    >
      <p>
        <span className='text-textSecondary'>{`© ${new Date().getFullYear()}, Made with ❤️ by `}</span>
        <Link href='https://stechnotools.com' target='_blank' className='text-primary capitalize'>
          Stechnotools
        </Link>
      </p>
    </div>
  )
}

export default FooterContent
