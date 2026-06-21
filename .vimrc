filetype plugin on
filetype indent on

set encoding=utf-8
set fileencodings=utf-8,ucs-bom,cp936

set history=1024
set undolevels=1024

set number                      " Show line numbers
set ruler
set cursorline                  " Highlight current line
set cursorcolumn
set showmatch                   " Show matching brackets
set showmode                    " Show current mode
set showcmd                     " Show commands
set laststatus=2                " Always show status line

set hlsearch                    " Highlight search results
set incsearch                   " Incremental search
set ignorecase                  " Case insensitive search
set smartcase                   " Smart case sensitivity

" Indentation and tabs
set expandtab                   " Convert tabs to spaces
set tabstop=2                   " Tab width
set shiftwidth=2                " Indentation width
set softtabstop=2               " Backspace indentation
set autoindent
set smartindent
set copyindent

" Line wrapping
set wrap                        " Wrap lines
set linebreak                   " Break at word boundaries
set breakindent

autocmd FileType html,css,javascript,json,typescript,tsx,jsx,vue,svelte,xml,svg,yaml,yml,markdown,mdx,toml setlocal shiftwidth=2 tabstop=2 softtabstop=2 expandtab
autocmd FileType python,ruby,php,perl,java,c,cpp,rust,swift,kotlin,dart,scala,groovy,objc,lua setlocal shiftwidth=4 tabstop=4 softtabstop=4 expandtab
autocmd FileType go,make,makefile,gitconfig,diff,patch setlocal shiftwidth=8 tabstop=8 softtabstop=0 noexpandtab
autocmd FileType sh,bash,zsh setlocal shiftwidth=4 tabstop=4 softtabstop=4 expandtab

" Git
autocmd BufNewFile,BufRead .gitconfig,gitconfig,.git/config,.git_config setfiletype gitconfig
autocmd BufNewFile,BufRead .gitignore,*.gitignore            setfiletype gitignore
autocmd BufNewFile,BufRead .gitattributes                    setfiletype conf

" Editor / Linter / Formatter
autocmd BufNewFile,BufRead .eslintrc,.babelrc,.jsbeautifyrc,.prettierrc,.watchmanconfig setfiletype json

" npm / yarn / pnpm
autocmd BufNewFile,BufRead .npmrc,.yarnrc,.pnpmrc           setfiletype conf

" Python
autocmd BufNewFile,BufRead .flake8,.pylintrc,.coveragerc    setfiletype dosini

" Env / Secrets
autocmd BufNewFile,BufRead .env,.env.*,.envrc               setfiletype sh

" TOML
autocmd BufNewFile,BufRead Cargo.toml,pyproject.toml,.cargo/config.toml,.taplo.toml                           setfiletype toml

" INI
autocmd BufNewFile,BufRead .editorconfig                    setfiletype conf
autocmd BufNewFile,BufRead .htaccess,httpd.conf,nginx.conf,*.conf                         setfiletype conf

" Docker / CI
autocmd BufNewFile,BufRead Dockerfile,Dockerfile.*           setfiletype dockerfile
autocmd BufNewFile,BufRead .dockerignore                     setfiletype gitignore

" tmux / screen
autocmd BufNewFile,BufRead .tmux.conf,tmux.conf              setfiletype tmux

" Vim
autocmd BufNewFile,BufRead .vimrc,vimrc,_vimrc               setfiletype vim

syntax enable
set background=dark

colorscheme elflord

set wildignore+=*.pyc,*.pyo,*.sqlite*
set wildignore+=*__pycache__*/**
set wildignore+=*.egg-info*/**
set wildignore+=*node_modules*/**

set exrc
set secure

" The end.
