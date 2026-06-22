export const filterMenuByPermissions = <T extends { permission?: string; children?: any[] }>(
  menuItems: T[],
  hasPermission: (permission?: string) => boolean
): T[] => {
  return menuItems
    .map(item => {
      if (item.permission && !hasPermission(item.permission)) {
        return null
      }

      if (item.children) {
        const filteredChildren = filterMenuByPermissions(item.children, hasPermission)

        if (filteredChildren.length === 0) {
          return null
        }

        return {
          ...item,
          children: filteredChildren
        }
      }

      return item
    })
    .filter((item): item is T => item !== null)
}
