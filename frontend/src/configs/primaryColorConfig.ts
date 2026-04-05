export type PrimaryColorConfig = {
  name?: string
  light?: string
  main: string
  dark?: string
}

// Primary color config object
const primaryColorConfig: PrimaryColorConfig[] = [
  {
    name: 'primary-1',
    light: '#D9AB4D',
    main: '#C8922E',
    dark: '#A8741E'
  },
  {
    name: 'primary-2',
    light: '#B68A55',
    main: '#8D6436',
    dark: '#6E4D28'
  },
  {
    name: 'primary-3',
    light: '#E7B56A',
    main: '#C98B2D',
    dark: '#9E6920'
  },
  {
    name: 'primary-4',
    light: '#C2875A',
    main: '#A3623C',
    dark: '#814A2E'
  },
  {
    name: 'primary-5',
    light: '#B89A72',
    main: '#94714A',
    dark: '#735638'
  }
]

export default primaryColorConfig
