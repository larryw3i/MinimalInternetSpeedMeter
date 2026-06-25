#!/usr/bin/bash

PROJECT_DIR="${PWD}"
SRC_DIR="${PWD}/src"
OUT_DIR="${PWD}/out"
TEMP_DIR="${PWD}/tmp"
METADATA_FILE="${PWD}/src/metadata.json"
EXTENSION_FULL_NAME=$( jq .uuid ${METADATA_FILE} | tail -c+2 | head -c -2 )
EXTENSION_NAME=$( echo ${EXTENSION_FULL_NAME} | cut -d '@' -f1 )
VERSION=$( jq ".\"version-name\"" ${METADATA_FILE} )
MAINTAINER_EMAIL="larryw3i_at_yeah.net"
MAINTAINER_NAME="larryw3i"
EXTENSION_REPO_URL="https://gitlab.gnome.org/larryw3i/MinimalInternetSpeedMeter https://github.com/larryw3i/MinimalInternetSpeedMeter"
POT_FILE="${PWD}/po/${EXTENSION_FULL_NAME}.pot"
GSCHEMA_PATH="${SRC_DIR}/schemas/org.gnome.shell.extensions.MinimalInternetSpeedMeter.gschema.xml"
DEFAULT_PACK_NAME="${EXTENSION_FULL_NAME}.shell-extension.zip"
DEFAULT_PACK_FILE="${OUT_DIR}/${DEFAULT_PACK_NAME}"
EXTENSIONS_DIR="${HOME}/.local/share/gnome-shell/extensions"
EXTENSION_DIR="${EXTENSIONS_DIR}/${EXTENSION_FULL_NAME}"
EXTENSION_DIR_CP="${TEMP_DIR}/${EXTENSION_FULL_NAME}"
RELEASE_DIR="${PROJECT_DIR}/releases"
RELEASE_HASH_FILE="${RELEASE_DIR}/sha256sums"

record_release_hash() {
    sha256=""
    if [[ ! -x $(which sha256sum) ]]; then
        echo "Command \"sha256sum\" was not found."
    fi
    if [[ ! -x $(which sed) ]]; then
        echo "Command \"sed\" was not found."
    fi

    cd ${OUT_DIR}
    sha256=$(sha256sum ${DEFAULT_PACK_FILE})
    sha256=$(echo ${sha256} | cut -d " " -f1)
    sha256="${sha256} ${VERSION}"
    cd ..
    echo "${sha256}"
    sed -i "1i ${sha256}" ${RELEASE_HASH_FILE}
    echo "Hash of release was writed."
}

restore_site_extension() {
    if [[ -d ${EXTENSION_DIR_CP} ]]; then
        echo "Site extension copy exists."
        echo "Move \"${EXTENSION_DIR_CP}\" to \"${EXTENSION_DIR}\"."
        mv ${EXTENSION_DIR_CP} ${EXTENSION_DIR}
        rm -rf ${EXTENSION_DIR_CP}
        echo "done."
    fi
}

copy_site_extension() {
    if [[ ! -d ${TEMP_DIR} ]]; then
        mkdir -p ${TEMP_DIR}
    fi
    if [[ -d ${EXTENSION_DIR} ]]; then
        echo "Site extension exists."
        echo "Move \"${EXTENSION_DIR}\" to \"${EXTENSION_DIR_CP}\"."
        mv ${EXTENSION_DIR} ${EXTENSION_DIR_CP}
        echo "done."
    fi
}

debug_extension() {
    copy_site_extension
    install_extension
    echo "Start debugging. . ."

    export SHELL_DEBUG=backtrace-warnings
    if [[ "$(gnome-shell --version | awk '{print int($3)}')" -ge 49 ]]; then
        dbus-run-session gnome-shell --devkit --wayland
    else
        dbus-run-session gnome-shell --nested --wayland
    fi
    restore_site_extension
}

install_extension() {
    pack_extension "$@"
    echo "Install ${DEFAULT_PACK_FILE}. . ."
    gnome-extensions \
        install \
        --force \
        ${DEFAULT_PACK_FILE}
    echo "${DEFAULT_PACK_FILE} installed."
    gnome-extensions disable "${EXTENSION_FULL_NAME}"
    gnome-extensions enable "${EXTENSION_FULL_NAME}"
}

update_pot() {
    echo "'xgettext' is extracting translatable strings. . ."
    version="${VERSION}"
    xgettext \
        -v \
        --from-code=UTF-8 \
        --output=${POT_FILE} \
        --package-name=${EXTENSION_NAME} \
        --package-version=${version} \
        src/*.js
    echo "Finish extracting."

    for po_file in $(ls ${PWD}/po/*.po); do
        echo "'msgmerge' is merging ${POT_FILE} to ${po_file}. . ."
        msgmerge \
            --no-location \
            -U \
            ${po_file} \
            ${POT_FILE}
    done
    echo "Finish merging."
}


update_version() {
    version0="${VERSION}"
    version1=$(date -u +%Y%m%d.%H%M%S)
    sed -i "s/${version0}/\"${version1}\"/g" ${METADATA_FILE}
    jq . ${METADATA_FILE}
    echo "${METADATA_FILE} was updated."
    VERSION=${version1}
}

pack_extension() {
    echo "packing extension. . ."
    update_version
    mkdir -p ${OUT_DIR}
    if [[ -f ${DEFAULT_PACK_FILE} ]]; then
        extension_cp=${DEFAULT_PACK_FILE/.zip/.$(uuid).zip}
        echo "Move ${DEFAULT_PACK_FILE} to ${extension_cp}"
        mv ${DEFAULT_PACK_FILE} ${extension_cp}
        echo "Finish moving."
    fi

    gnome-extensions pack \
        --podir=${PWD}/po \
        -o ${OUT_DIR} \
        ${SRC_DIR}

    if echo "$@" | grep -q -P "\B--write-hash\b"; then
        record_release_hash
    fi

    echo "Finish packing."
    echo "The new version is ${VERSION} ."
}

format_code() {
    run_prettier() {
        export PATH=${HOME}/.npm-global/bin:$PATH
        if [[ "$(which prettier)" != *"/bin/prettier" ]]; then
            echo "Trying to install prettier ..."
            mkdir -p ${HOME}/.npm-global
            npm config set prefix "${HOME}/.npm-global"
            export PATH=${HOME}/.npm-global/bin:$PATH
            npm i -g prettier
        fi
        prettier --write --print-width 80 ${PROJECT_DIR}
    }
    
    run_shfmt(){
        if [[ -x $(which shfmt) ]];
        then
            shfmt -i 4 -w -f ${PROJECT_DIR}
        else
            echo "Trying to install `shfmt` ..."
            sudo apt-get install shfmt
        fi
    }

    run_xmllint(){
        if [[ -x $(which xmllint) ]];
        then
            echo "Formatting ${GSCHEMA_PATH} ..."
            xmllint --output ${GSCHEMA_PATH} --format ${GSCHEMA_PATH}
        fi
    }

    run_prettier
    run_shfmt
    run_xmllint
}

func="$1"
shift
# Let's start
if [[ "${func}" == "-b" ]]; then
    # build
    pack_extension "$@"
elif [[ "${func}" == "-i" ]]; then
    # install
    install_extension "$@"
elif [[ "${func}" == "-d" ]]; then
    debug_extension "$@"
else
    $func "$@"
fi

# The end.
