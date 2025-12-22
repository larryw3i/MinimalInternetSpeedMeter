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

" Line wrapping
set wrap                        " Wrap lines
set linebreak                   " Break at word boundaries
set breakindent

autocmd BufNewFile,BufRead .git/config,.git_config set filetype=yaml

autocmd FileType html,css,javascript setlocal shiftwidth=2 tabstop=2 softtabstop=2
autocmd FileType python,yaml setlocal shiftwidth=4 tabstop=4 softtabstop=4

syntax enable
set background=dark

colorscheme elflord

set exrc
set secure

" The end.
