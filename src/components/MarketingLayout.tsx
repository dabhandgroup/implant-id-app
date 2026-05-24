import AnnounceBar from './AnnounceBar'
import Nav from './Nav'
import Footer from './Footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnounceBar />
      <Nav />
      {children}
      <Footer />
    </>
  )
}
